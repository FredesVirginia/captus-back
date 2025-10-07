import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Orden } from './entity/order.entity';
import { OrdenItem } from './entity/orderitem.entity';
import { User } from 'src/users/entity/user.entity';
import { Floor } from 'src/floors/entity/floor.entity';
import { PrintService } from 'src/print/print.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { OrderItemDto } from './dtos/OrderDto';
import { PagoEnum } from './enums/PagosEnum';
import { FloorEnum } from 'src/floors/enums/FloorEnum';
import { UserEnum } from 'src/users/enums/user.enum';

// Mock del template
jest.mock('src/print/templates/ordenTemplate', () => ({
  buildOrderTemplate: jest.fn().mockResolvedValue({ content: 'mock-template' }),
}));

describe('OrderService', () => {
  let service: OrderService;
  let orderRepo: jest.Mocked<Repository<Orden>>;
  let orderItemRepo: jest.Mocked<Repository<OrdenItem>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let plantRepo: jest.Mocked<Repository<Floor>>;
  let printService: jest.Mocked<PrintService>;

  const mockOrderRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockOrderItemRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  const mockPlantRepo = {
    findOne: jest.fn(),
  };

  const mockPrintService = {
    generatePdf: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: getRepositoryToken(Orden),
          useValue: mockOrderRepo,
        },
        {
          provide: getRepositoryToken(OrdenItem),
          useValue: mockOrderItemRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(Floor),
          useValue: mockPlantRepo,
        },
        {
          provide: PrintService,
          useValue: mockPrintService,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    orderRepo = module.get(getRepositoryToken(Orden));
    orderItemRepo = module.get(getRepositoryToken(OrdenItem));
    userRepo = module.get(getRepositoryToken(User));
    plantRepo = module.get(getRepositoryToken(Floor));
    printService = module.get(PrintService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    const mockUser = {
      id: 1,
      nombre: 'Test User',
      email: 'test@example.com',
      role: UserEnum.USER,
    } as User;

    const mockPlant1 = {
      id: 1,
      nombre: 'Planta 1',
      descripcion: 'Desc 1',
      categoria: FloorEnum.CAPTU,
      precio: 100,
      stock: 10,
      imagenUrl: 'url1.jpg',
    } as Floor;

    const mockPlant2 = {
      id: 2,
      nombre: 'Planta 2',
      descripcion: 'Desc 2',
      categoria: FloorEnum.CAPTU,
      precio: 200,
      stock: 5,
      imagenUrl: 'url2.jpg',
    } as Floor;

    const itemsDto: OrderItemDto[] = [
      { plantId: 1, quantity: 2 },
      { plantId: 2, quantity: 1 },
    ];

    it('should create order successfully with multiple items', async () => {
      const mockOrder = {
        id: 1,
        user: mockUser,
        estado: PagoEnum.PENDIENTE,
        total: 0,
      } as Orden;

      const mockOrderItem1 = {
        id: 1,
        orden: mockOrder,
        planta: mockPlant1,
        cantidad: 2,
        precioUnitario: 100,
      } as OrdenItem;

      const mockOrderItem2 = {
        id: 2,
        orden: mockOrder,
        planta: mockPlant2,
        cantidad: 1,
        precioUnitario: 200,
      } as OrdenItem;

      const fullOrder = {
        id: 1,
        items: [mockOrderItem1, mockOrderItem2],
      } as Orden;

      userRepo.findOne.mockResolvedValue(mockUser);
      orderRepo.create.mockReturnValue(mockOrder);
      orderRepo.save.mockResolvedValue(mockOrder);
      plantRepo.findOne
        .mockResolvedValueOnce(mockPlant1)
        .mockResolvedValueOnce(mockPlant2);
      orderItemRepo.create
        .mockReturnValueOnce(mockOrderItem1)
        .mockReturnValueOnce(mockOrderItem2);
      orderItemRepo.save.mockResolvedValue([mockOrderItem1, mockOrderItem2] as any);
      orderRepo.findOne.mockResolvedValue(fullOrder);

      const result = await service.createOrder(1, itemsDto);

      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(orderRepo.create).toHaveBeenCalledWith({
        user: mockUser,
        estado: PagoEnum.PENDIENTE,
        total: 0,
      });
      expect(plantRepo.findOne).toHaveBeenCalledTimes(2);
      expect(orderItemRepo.save).toHaveBeenCalled();
      expect(orderRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ total: 400 }),
      );
      expect(result.id).toBe(1);
      expect(result.items).toHaveLength(2);
    });

    it('should throw USER_NOT_FOUND when user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.createOrder(999, itemsDto)).rejects.toThrow(
        new HttpException(
          { code: 'USER_NOT_FOUND', status: HttpStatus.NOT_FOUND },
          HttpStatus.NOT_FOUND,
        ),
      );

      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: 999 } });
      expect(orderRepo.create).not.toHaveBeenCalled();
    });

    it('should throw PLANT_NOT_FOUND when plant does not exist', async () => {
      const mockOrder = {
        id: 1,
        user: mockUser,
        estado: PagoEnum.PENDIENTE,
        total: 0,
      } as Orden;

      userRepo.findOne.mockResolvedValue(mockUser);
      orderRepo.create.mockReturnValue(mockOrder);
      orderRepo.save.mockResolvedValue(mockOrder);
      plantRepo.findOne.mockResolvedValue(null);

      await expect(service.createOrder(1, itemsDto)).rejects.toThrow(
        new HttpException(
          {
            code: 'PLANT_NOT_FOUND',
            message: `Planta con id ${itemsDto[0].plantId} no encontrada`,
            status: HttpStatus.NOT_FOUND,
          },
          HttpStatus.NOT_FOUND,
        ),
      );
    });

    it('should calculate total correctly', async () => {
      const mockOrder = {
        id: 1,
        user: mockUser,
        estado: PagoEnum.PENDIENTE,
        total: 0,
      } as Orden;

      const mockOrderItem1 = {
        id: 1,
        orden: mockOrder,
        planta: mockPlant1,
        cantidad: 2,
        precioUnitario: 100,
      } as OrdenItem;

      const fullOrder = {
        id: 1,
        items: [mockOrderItem1],
      } as Orden;

      userRepo.findOne.mockResolvedValue(mockUser);
      orderRepo.create.mockReturnValue(mockOrder);
      orderRepo.save.mockResolvedValue(mockOrder);
      plantRepo.findOne.mockResolvedValue(mockPlant1);
      orderItemRepo.create.mockReturnValue(mockOrderItem1);
      orderItemRepo.save.mockResolvedValue([mockOrderItem1] as any);
      orderRepo.findOne.mockResolvedValue(fullOrder);

      await service.createOrder(1, [{ plantId: 1, quantity: 2 }]);

      // Total should be 100 * 2 = 200
      expect(orderRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ total: 200 }),
      );
    });

    it('should throw CREATE_ORDER_ERROR on unexpected error', async () => {
      userRepo.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.createOrder(1, itemsDto)).rejects.toThrow(
        new HttpException(
          {
            code: 'CREATE_ORDER_ERROR',
            message: 'No se pudo crear la orden. Intenta nuevamente.',
            status: HttpStatus.INTERNAL_SERVER_ERROR,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('getOrderWithItems', () => {
    it('should return order with items successfully', async () => {
      const mockOrder = {
        id: 1,
        total: 400,
        estado: PagoEnum.PENDIENTE,
        items: [
          {
            id: 1,
            cantidad: 2,
            precioUnitario: 100,
            planta: {
              id: 1,
              nombre: 'Planta 1',
            },
          },
        ],
      } as Orden;

      orderRepo.findOne.mockResolvedValue(mockOrder);

      const result = await service.getOrderWithItems(1);

      expect(orderRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['items', 'items.planta'],
      });
      expect(result).toEqual({
        data: mockOrder,
        status: 200,
      });
    });

    it('should throw ORDER_NOT_FOUND when order does not exist', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      await expect(service.getOrderWithItems(999)).rejects.toThrow(
        new HttpException(
          {
            code: 'ORDER_NOT_FOUND',
            message: 'No se encontró la orden',
            status: HttpStatus.NOT_FOUND,
          },
          HttpStatus.NOT_FOUND,
        ),
      );
    });

    it('should throw GET_ORDER_ERROR on database error', async () => {
      orderRepo.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.getOrderWithItems(1)).rejects.toThrow(
        new HttpException(
          {
            code: 'GET_ORDER_ERROR',
            message: 'Error al obtener la orden',
            status: HttpStatus.INTERNAL_SERVER_ERROR,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('printOrder', () => {
    const mockOrder = {
      id: 1,
      total: 400,
      estado: PagoEnum.PENDIENTE,
      user: {
        id: 1,
        nombre: 'Test User',
        email: 'test@example.com',
      },
      items: [
        {
          id: 1,
          cantidad: 2,
          precioUnitario: 100,
          planta: {
            id: 1,
            nombre: 'Planta 1',
          },
        },
      ],
    } as Orden;

    it('should generate PDF successfully', async () => {
      const mockPdfBuffer = Buffer.from('mock-pdf-content');

      orderRepo.findOne.mockResolvedValue(mockOrder);
      printService.generatePdf.mockResolvedValue(mockPdfBuffer);

      const result = await service.printOrder(1);

      expect(orderRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['user', 'items', 'items.planta'],
      });
      expect(printService.generatePdf).toHaveBeenCalled();
      expect(result).toEqual(mockPdfBuffer);
    });

    it('should throw ORDER_NOT_FOUND when order does not exist', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      await expect(service.printOrder(999)).rejects.toThrow(
        new HttpException(
          {
            code: 'ORDER_NOT_FOUND',
            message: 'Orden no encontrada',
            status: HttpStatus.NOT_FOUND,
          },
          HttpStatus.NOT_FOUND,
        ),
      );

      expect(printService.generatePdf).not.toHaveBeenCalled();
    });

    it('should throw PDF_GENERATION_FAILED when PDF generation fails', async () => {
      orderRepo.findOne.mockResolvedValue(mockOrder);
      printService.generatePdf.mockRejectedValue(new Error('PDF error'));

      await expect(service.printOrder(1)).rejects.toThrow(
        new HttpException(
          {
            code: 'PDF_GENERATION_FAILED',
            message: 'No se pudo generar el PDF',
            status: HttpStatus.INTERNAL_SERVER_ERROR,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });

    it('should throw PRINT_ORDER_ERROR on unexpected error', async () => {
      orderRepo.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.printOrder(1)).rejects.toThrow(
        new HttpException(
          {
            code: 'PRINT_ORDER_ERROR',
            message: 'Error al imprimir la orden',
            status: HttpStatus.INTERNAL_SERVER_ERROR,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });
});