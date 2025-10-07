import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pago } from './entity/pago.entity';
import { Orden } from './entity/order.entity';
import { Floor } from 'src/floors/entity/floor.entity';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { EstadoPagoEnum, MedioPagoEnum, PagoEnum } from './enums/PagosEnum';
import { OrderWithItems } from 'src/order/types/OrderTypes';

// Mock del módulo vexor
jest.mock('vexor', () => ({
  Vexor: jest.fn().mockImplementation(() => ({
    pay: {
      mercadopago: jest.fn(),
    },
  })),
}));

describe('PaymentsService', () => {
  let service: PaymentsService;
  let pagoRepo: jest.Mocked<Repository<Pago>>;
  let orderRepo: jest.Mocked<Repository<Orden>>;
  let floorRepo: jest.Mocked<Repository<Floor>>;
  let configService: jest.Mocked<ConfigService>;

  const mockPagoRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockOrderRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockFloorRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    // Mock Logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    mockConfigService.get.mockImplementation((key: string) => {
      const config = {
        VEXOR_PROJECT: 'test-project',
        VEXOR_PUBLISHABLE_KEY: 'test-publishable-key',
        VEXOR_SECRET_KEY: 'test-secret-key',
        PAYMENT_SUCCESS_URL: 'http://localhost:3000/success',
        PAYMENT_FAILURE_URL: 'http://localhost:3000/failure',
        PAYMENT_PENDING_URL: 'http://localhost:3000/pending',
      };
      return config[key];
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(Pago),
          useValue: mockPagoRepo,
        },
        {
          provide: getRepositoryToken(Orden),
          useValue: mockOrderRepo,
        },
        {
          provide: getRepositoryToken(Floor),
          useValue: mockFloorRepo,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    pagoRepo = module.get(getRepositoryToken(Pago));
    orderRepo = module.get(getRepositoryToken(Orden));
    floorRepo = module.get(getRepositoryToken(Floor));
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPayment', () => {
    const mockOrder: OrderWithItems = {
      id: 1,
      items: [
        {
          id: 1,
          planta: {
            id: 1,
            nombre: 'Planta 1',
            descripcion: 'Desc 1',
            categoria: 'CAPTU',
            precio: '100',
            stock: 10,
            imagenUrl: 'url1.jpg',
          },
          cantidad: 2,
          precioUnitario: '100',
        },
      ],
    };

    it('should create payment successfully', async () => {
      const mockVexorResponse = {
        paymentUrl: 'https://mercadopago.com/pay/123',
        paymentId: 'mp-123',
      };

      const mockPago = {
        id: 1,
        monto: 200,
        metodo: MedioPagoEnum.TARJETA,
        estado: EstadoPagoEnum.PENDIENTE,
      } as Pago;

      // Mock vexor client
      (service as any).vexorClient.pay.mercadopago.mockResolvedValue(
        mockVexorResponse,
      );
      mockPagoRepo.create.mockReturnValue(mockPago);
      mockPagoRepo.save.mockResolvedValue(mockPago);
      mockOrderRepo.update.mockResolvedValue(undefined);

      const result = await service.createPayment(mockOrder);

      expect((service as any).vexorClient.pay.mercadopago).toHaveBeenCalledWith({
        items: [
          {
            title: 'Planta 1',
            unit_price: 100,
            quantity: 2,
          },
        ],
        metadata: { orderId: 1 },
        redirectUrls: expect.objectContaining({
          success: 'http://localhost:3000/payments/success',
        }),
      });
      expect(pagoRepo.create).toHaveBeenCalled();
      expect(pagoRepo.save).toHaveBeenCalledWith(mockPago);
      expect(orderRepo.update).toHaveBeenCalledWith(1, { pago: mockPago });
      expect(result).toEqual({
        ...mockVexorResponse,
        pagoId: mockPago.id,
      });
    });

    it('should calculate total amount correctly from items', async () => {
      const orderWithMultipleItems: OrderWithItems = {
        id: 2,
        items: [
          {
            id: 1,
            planta: {
              id: 1,
              nombre: 'Planta 1',
              descripcion: 'Desc',
              categoria: 'CAPTU',
              precio: '100',
              stock: 10,
              imagenUrl: 'url.jpg',
            },
            cantidad: 2,
            precioUnitario: '100',
          },
          {
            id: 2,
            planta: {
              id: 2,
              nombre: 'Planta 2',
              descripcion: 'Desc',
              categoria: 'CAPTU',
              precio: '50',
              stock: 5,
              imagenUrl: 'url2.jpg',
            },
            cantidad: 3,
            precioUnitario: '50',
          },
        ],
      };

      const mockPago = { id: 1 } as Pago;
      (service as any).vexorClient.pay.mercadopago.mockResolvedValue({});
      mockPagoRepo.create.mockReturnValue(mockPago);
      mockPagoRepo.save.mockResolvedValue(mockPago);
      mockOrderRepo.update.mockResolvedValue(undefined);

      await service.createPayment(orderWithMultipleItems);

      // Total should be: (100 * 2) + (50 * 3) = 350
      expect(pagoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          monto: 350,
        }),
      );
    });

    it('should throw PAYMENT_CREATION_FAILED when vexor fails', async () => {
      (service as any).vexorClient.pay.mercadopago.mockRejectedValue(
        new Error('Vexor error'),
      );

      await expect(service.createPayment(mockOrder)).rejects.toThrow(
        new HttpException(
          {
            code: 'PAYMENT_CREATION_FAILED',
            message: 'No se pudo crear el pago. Intenta nuevamente.',
            status: HttpStatus.INTERNAL_SERVER_ERROR,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });

    it('should throw CREATE_PAYMENT_ERROR on unexpected error', async () => {
      (service as any).vexorClient.pay.mercadopago.mockResolvedValue({});
      mockPagoRepo.create.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(service.createPayment(mockOrder)).rejects.toThrow(
        new HttpException(
          {
            code: 'CREATE_PAYMENT_ERROR',
            message: 'Ocurrió un error inesperado al crear el pago',
            status: HttpStatus.INTERNAL_SERVER_ERROR,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('handleWebhook', () => {
    const webhookData = {
      orderId: 1,
      status: EstadoPagoEnum.CONFIRMADO,
      paymentId: 'mp-123',
      amount: 200,
      method: MedioPagoEnum.TARJETA,
    };

    it('should update existing payment status successfully', async () => {
      const mockPago = {
        id: 1,
        estado: EstadoPagoEnum.PENDIENTE,
        orden: { id: 1 } as Orden,
      } as Pago;

      const mockOrden = {
        id: 1,
        estado: PagoEnum.PENDIENTE,
        items: [
          {
            id: 1,
            cantidad: 2,
          },
        ],
      } as Orden;

      const mockFloor = {
        id: 1,
        stock: 10,
      } as Floor;

      mockPagoRepo.findOne.mockResolvedValue(mockPago);
      mockPagoRepo.save.mockResolvedValue(mockPago);
      mockOrderRepo.findOne.mockResolvedValue(mockOrden);
      mockOrderRepo.save.mockResolvedValue(mockOrden);
      mockFloorRepo.findOne.mockResolvedValue(mockFloor);
      mockFloorRepo.save.mockResolvedValue(mockFloor);

      const result = await service.handleWebhook(webhookData);

      expect(pagoRepo.findOne).toHaveBeenCalledWith({
        where: { orden: { id: 1 } },
        relations: ['orden'],
      });
      expect(mockPago.estado).toBe(EstadoPagoEnum.CONFIRMADO);
      expect(pagoRepo.save).toHaveBeenCalledWith(mockPago);
      expect(result).toEqual({ received: true });
    });

    it('should create new payment if not exists', async () => {
      const mockOrden = { id: 1, items: [] } as any;
      const newPago = {
        id: 2,
        monto: 200,
        estado: EstadoPagoEnum.CONFIRMADO,
      } as Pago;

      mockPagoRepo.findOne.mockResolvedValue(null);
      mockOrderRepo.findOne.mockResolvedValue(mockOrden);
      mockPagoRepo.create.mockReturnValue(newPago);
      mockPagoRepo.save.mockResolvedValue(newPago);
      mockOrderRepo.save.mockResolvedValue(mockOrden);

      const result = await service.handleWebhook(webhookData);

      expect(orderRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(pagoRepo.create).toHaveBeenCalledWith({
        orden: mockOrden,
        monto: 200,
        metodo: MedioPagoEnum.TARJETA,
        estado: EstadoPagoEnum.CONFIRMADO,
      });
      expect(pagoRepo.save).toHaveBeenCalledWith(newPago);
      expect(result).toEqual({ received: true });
    });

    it('should update order status to PAGADO when payment confirmed', async () => {
      const mockPago = {
        id: 1,
        estado: EstadoPagoEnum.PENDIENTE,
      } as Pago;

      const mockOrden = {
        id: 1,
        estado: PagoEnum.PENDIENTE,
        items: [],
      } as any;

      mockPagoRepo.findOne.mockResolvedValue(mockPago);
      mockPagoRepo.save.mockResolvedValue(mockPago);
      mockOrderRepo.findOne.mockResolvedValue(mockOrden);
      mockOrderRepo.save.mockResolvedValue(mockOrden);

      await service.handleWebhook(webhookData);

      expect(mockOrden.estado).toBe(PagoEnum.PAGADO);
      expect(orderRepo.save).toHaveBeenCalledWith(mockOrden);
    });

    it('should decrement floor stock when payment confirmed', async () => {
      const mockPago = { id: 1, estado: EstadoPagoEnum.PENDIENTE } as Pago;
      const mockOrden = {
        id: 1,
        items: [{ id: 1, cantidad: 3 }],
      } as Orden;
      const mockFloor = { id: 1, stock: 10 } as Floor;

      mockPagoRepo.findOne.mockResolvedValue(mockPago);
      mockPagoRepo.save.mockResolvedValue(mockPago);
      mockOrderRepo.findOne.mockResolvedValue(mockOrden);
      mockOrderRepo.save.mockResolvedValue(mockOrden);
      mockFloorRepo.findOne.mockResolvedValue(mockFloor);
      mockFloorRepo.save.mockResolvedValue(mockFloor);

      await service.handleWebhook(webhookData);

      expect(floorRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockFloor.stock).toBe(7); // 10 - 3 = 7
      expect(floorRepo.save).toHaveBeenCalledWith(mockFloor);
    });

    it('should throw ORDER_NOT_FOUND when order does not exist', async () => {
      mockPagoRepo.findOne.mockResolvedValue(null);
      mockOrderRepo.findOne.mockResolvedValue(null);

      await expect(service.handleWebhook(webhookData)).rejects.toThrow(
        new HttpException(
          {
            code: 'ORDER_NOT_FOUND',
            message: 'Orden no encontrada',
            status: HttpStatus.NOT_FOUND,
          },
          HttpStatus.NOT_FOUND,
        ),
      );
    });

    it('should not update stock if payment status is not CONFIRMADO', async () => {
      const pendingWebhookData = {
        ...webhookData,
        status: EstadoPagoEnum.PENDIENTE,
      };

      const mockPago = { id: 1, estado: EstadoPagoEnum.PENDIENTE } as Pago;

      mockPagoRepo.findOne.mockResolvedValue(mockPago);
      mockPagoRepo.save.mockResolvedValue(mockPago);

      await service.handleWebhook(pendingWebhookData);

      expect(orderRepo.findOne).not.toHaveBeenCalled();
      expect(floorRepo.save).not.toHaveBeenCalled();
    });

    it('should throw WEBHOOK_PROCESSING_ERROR on unexpected error', async () => {
      mockPagoRepo.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.handleWebhook(webhookData)).rejects.toThrow(
        new HttpException(
          {
            code: 'WEBHOOK_PROCESSING_ERROR',
            message: 'Ocurrió un error al procesar el webhook',
            status: HttpStatus.INTERNAL_SERVER_ERROR,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });
});