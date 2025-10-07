import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { OrderService } from 'src/order/order.service';
import { MailService } from 'src/mailer/mailer.service';
import { Response } from 'express';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: jest.Mocked<PaymentsService>;
  let orderService: jest.Mocked<OrderService>;
  let mailerService: jest.Mocked<MailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            createPayment: jest.fn(),
            handleWebhook: jest.fn(),
          },
        },
        {
          provide: OrderService,
          useValue: {
            createOrder: jest.fn(),
            printOrder: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendOrderMail: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    paymentsService = module.get(PaymentsService);
    orderService = module.get(OrderService);
    mailerService = module.get(MailService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPayment', () => {
    it('should call paymentsService.createPayment with order', async () => {
      const mockOrder = { id: 1, items: [] } as any;
      paymentsService.createPayment.mockResolvedValue('payment created');

      const result = await controller.createPayment(mockOrder);

      expect(paymentsService.createPayment).toHaveBeenCalledWith(mockOrder);
      expect(result).toBe('payment created');
    });
  });

  describe('checkout', () => {
    it('should create order, print it and create payment', async () => {
      const dto = { userId: 1, items: [{ id: 10 }] } as any;
      const mockOrder = { id: 1, total: 100 };
      const mockPdfBuffer = Buffer.from('pdf');
      const mockPayment = { id: 'pay_1', status: 'pending' };

      orderService.createOrder.mockResolvedValue(mockOrder as any);
      orderService.printOrder.mockResolvedValue(mockPdfBuffer);
      paymentsService.createPayment.mockResolvedValue(mockPayment as any);

      const result = await controller.checkout(dto);

      expect(orderService.createOrder).toHaveBeenCalledWith(dto.userId, dto.items);
      expect(orderService.printOrder).toHaveBeenCalledWith(mockOrder.id);
      expect(paymentsService.createPayment).toHaveBeenCalledWith(mockOrder);
      expect(result).toEqual({
        order: mockOrder,
        pago: mockPayment,
      });
    });
  });

  describe('webhook', () => {
    it('should call paymentsService.handleWebhook and return 200 ok', async () => {
      const mockReq = { body: { id: 'test123' } } as any;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.webhook(mockReq, mockRes);

      expect(paymentsService.handleWebhook).toHaveBeenCalledWith(mockReq.body);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith('ok');
    });
  });

  describe('GET endpoints', () => {
    it('should return success message', () => {
      expect(controller.paymentsSucefull()).toBe('Payments SUCEES');
    });

    it('should return failure message', () => {
      expect(controller.paymentsFail()).toBe('Payments SUCEES');
    });

    it('should return pending message', () => {
      expect(controller.paymentsPedding()).toBe('Payments SUCEES');
    });
  });
});
