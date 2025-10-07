import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { CreateOrdenDto, OrderItemDto } from './dtos/OrderDto';
import { Response } from 'express';
import { FloorEnum } from 'src/floors/enums/FloorEnum';

describe('OrderController', () => {
  let controller: OrderController;
  let service: OrderService;

  const mockOrderService = {
    createOrder: jest.fn(),
    printOrder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: mockOrderService,
        },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
    service = module.get<OrderService>(OrderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createOrder', () => {
    it('should create order successfully with single item', async () => {
      const items: OrderItemDto[] = [
        {
          plantId: 1,
          quantity: 2,
        },
      ];

      const createOrderDto: CreateOrdenDto = {
        userId: 1,
        items,
      };

      const expectedResult = {
        id: 1,
        items: [
          {
            id: 1,
            planta: {
              id: 1,
              nombre: 'Planta 1',
              descripcion: 'Descripción 1',
              categoria: FloorEnum.CAPTU,
              precio: '100',
              stock: 10,
              imagenUrl: 'url1.jpg',
            },
            cantidad: 2,
            precioUnitario: '100',
          },
        ],
      };

      mockOrderService.createOrder.mockResolvedValue(expectedResult);

      const result = await controller.createOrder(createOrderDto);

      expect(service.createOrder).toHaveBeenCalledWith(
        createOrderDto.userId,
        createOrderDto.items,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should create order successfully with multiple items', async () => {
      const items: OrderItemDto[] = [
        {
          plantId: 1,
          quantity: 2,
        },
        {
          plantId: 2,
          quantity: 1,
        },
      ];

      const createOrderDto: CreateOrdenDto = {
        userId: 1,
        items,
      };

      const expectedResult = {
        id: 1,
        items: [
          {
            id: 1,
            planta: {
              id: 1,
              nombre: 'Planta 1',
              descripcion: 'Descripción 1',
              categoria: FloorEnum.CAPTU,
              precio: '100',
              stock: 10,
              imagenUrl: 'url1.jpg',
            },
            cantidad: 2,
            precioUnitario: '100',
          },
          {
            id: 2,
            planta: {
              id: 2,
              nombre: 'Planta 2',
              descripcion: 'Descripción 2',
              categoria: FloorEnum.CAPTU,
              precio: '200',
              stock: 5,
              imagenUrl: 'url2.jpg',
            },
            cantidad: 1,
            precioUnitario: '200',
          },
        ],
      };

      mockOrderService.createOrder.mockResolvedValue(expectedResult);

      const result = await controller.createOrder(createOrderDto);

      expect(service.createOrder).toHaveBeenCalledWith(
        createOrderDto.userId,
        createOrderDto.items,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should pass userId and items separately to service', async () => {
      const createOrderDto: CreateOrdenDto = {
        userId: 5,
        items: [{ plantId: 10, quantity: 3 }],
      };

      const expectedResult = {
        id: 5,
        items: [],
      };

      mockOrderService.createOrder.mockResolvedValue(expectedResult);

      await controller.createOrder(createOrderDto);

      expect(service.createOrder).toHaveBeenCalledWith(5, [
        { plantId: 10, quantity: 3 },
      ]);
    });
  });

  describe('printOrder', () => {
    let mockResponse: Partial<Response>;

    beforeEach(() => {
      mockResponse = {
        set: jest.fn().mockReturnThis(),
        end: jest.fn(),
      };
    });

    it('should generate and return PDF successfully', async () => {
      const orderId = 1;
      const mockPdfBuffer = Buffer.from('mock-pdf-content');

      mockOrderService.printOrder.mockResolvedValue(mockPdfBuffer);

      await controller.printOrder(orderId, mockResponse as Response);

      expect(service.printOrder).toHaveBeenCalledWith(orderId);
      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename=orden-${orderId}.pdf`,
        'Content-Length': mockPdfBuffer.length,
      });
      expect(mockResponse.end).toHaveBeenCalledWith(mockPdfBuffer);
    });

    it('should handle PDF generation for different order IDs', async () => {
      const orderId = 999;
      const mockPdfBuffer = Buffer.from('different-pdf-content');

      mockOrderService.printOrder.mockResolvedValue(mockPdfBuffer);

      await controller.printOrder(orderId, mockResponse as Response);

      expect(service.printOrder).toHaveBeenCalledWith(orderId);
      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename=orden-${orderId}.pdf`,
        'Content-Length': mockPdfBuffer.length,
      });
      expect(mockResponse.end).toHaveBeenCalledWith(mockPdfBuffer);
    });

    it('should convert string id parameter to number', async () => {
      const stringId = 42;
      const mockPdfBuffer = Buffer.from('pdf-content');

      mockOrderService.printOrder.mockResolvedValue(mockPdfBuffer);

      await controller.printOrder(stringId, mockResponse as Response);

      // The +id conversion should ensure it's a number
      expect(service.printOrder).toHaveBeenCalledWith(42);
    });

    it('should set correct content-type and disposition headers', async () => {
      const orderId = 123;
      const mockPdfBuffer = Buffer.from('test-pdf', 'utf-8');

      mockOrderService.printOrder.mockResolvedValue(mockPdfBuffer);

      await controller.printOrder(orderId, mockResponse as Response);

      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename=orden-123.pdf',
        }),
      );
    });

    it('should set correct content-length header', async () => {
      const orderId = 1;
      const pdfContent = 'this is a longer pdf content for testing';
      const mockPdfBuffer = Buffer.from(pdfContent, 'utf-8');

      mockOrderService.printOrder.mockResolvedValue(mockPdfBuffer);

      await controller.printOrder(orderId, mockResponse as Response);

      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Length': mockPdfBuffer.length,
        }),
      );
    });
  });
});