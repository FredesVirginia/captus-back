import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mailer.service';
import { MailerService } from '@nestjs-modules/mailer';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';

describe('MailService', () => {
  let service: MailService;
  let mailerService: jest.Mocked<MailerService>;

  const mockMailerService = {
    sendMail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    mailerService = module.get(MailerService);

    // Mock Logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendOrderMail', () => {
    const mockEmail = 'customer@example.com';
    const mockOrderId = 12345;
    const mockPdfBuffer = Buffer.from('fake-pdf-content');

    it('should send order email successfully', async () => {
      mockMailerService.sendMail.mockResolvedValue(undefined);

      const result = await service.sendOrderMail(
        mockEmail,
        mockOrderId,
        mockPdfBuffer,
      );

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: mockEmail,
        subject: `Nueva orden recibida - #${mockOrderId}`,
        text: `Se ha registrado una nueva orden con ID ${mockOrderId}. Encuentra el PDF adjunto.`,
        attachments: [
          {
            filename: `orden-${mockOrderId}.pdf`,
            content: mockPdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });

      expect(result).toEqual({
        message: `Correo enviado correctamente a ${mockEmail}`,
        status: 200,
      });
    });

    it('should log success message when email is sent', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      mockMailerService.sendMail.mockResolvedValue(undefined);

      await service.sendOrderMail(mockEmail, mockOrderId, mockPdfBuffer);

      expect(logSpy).toHaveBeenCalledWith(
        `📧 Correo enviado correctamente a ${mockEmail} para la orden #${mockOrderId}`,
      );
    });

    it('should send email with correct PDF attachment', async () => {
      const customPdfBuffer = Buffer.from('custom-pdf-data-12345');
      const customOrderId = 99999;

      mockMailerService.sendMail.mockResolvedValue(undefined);

      await service.sendOrderMail(
        'test@example.com',
        customOrderId,
        customPdfBuffer,
      );

      expect(mailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [
            {
              filename: `orden-${customOrderId}.pdf`,
              content: customPdfBuffer,
              contentType: 'application/pdf',
            },
          ],
        }),
      );
    });

    it('should throw EMAIL_SEND_FAILED error when mailer service fails', async () => {
      const mailerError = new Error('SMTP connection failed');
      mockMailerService.sendMail.mockRejectedValue(mailerError);

      await expect(
        service.sendOrderMail(mockEmail, mockOrderId, mockPdfBuffer),
      ).rejects.toThrow(
        new HttpException(
          {
            code: 'EMAIL_SEND_FAILED',
            message:
              'No se pudo enviar el correo electrónico. Inténtalo más tarde.',
            status: HttpStatus.INTERNAL_SERVER_ERROR,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });

    it('should log error when email sending fails', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      const mailerError = new Error('SMTP error');
      mockMailerService.sendMail.mockRejectedValue(mailerError);

      try {
        await service.sendOrderMail(mockEmail, mockOrderId, mockPdfBuffer);
      } catch (error) {
        // Expected error
      }

      expect(errorSpy).toHaveBeenCalledWith(
        '❌ Error enviando correo:',
        mailerError,
      );
    });

    it('should rethrow HttpException if already thrown', async () => {
      const customHttpException = new HttpException(
        { code: 'CUSTOM_ERROR', status: HttpStatus.BAD_REQUEST },
        HttpStatus.BAD_REQUEST,
      );

      mockMailerService.sendMail.mockRejectedValue(customHttpException);

      await expect(
        service.sendOrderMail(mockEmail, mockOrderId, mockPdfBuffer),
      ).rejects.toThrow(customHttpException);
    });

    it('should handle invalid email addresses gracefully', async () => {
      const invalidEmail = 'invalid-email';
      const mailerError = new Error('Invalid recipient');
      mockMailerService.sendMail.mockRejectedValue(mailerError);

      await expect(
        service.sendOrderMail(invalidEmail, mockOrderId, mockPdfBuffer),
      ).rejects.toThrow(
        new HttpException(
          {
            code: 'EMAIL_SEND_FAILED',
            message:
              'No se pudo enviar el correo electrónico. Inténtalo más tarde.',
            status: HttpStatus.INTERNAL_SERVER_ERROR,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });

    it('should handle empty PDF buffer', async () => {
      const emptyBuffer = Buffer.from('');
      mockMailerService.sendMail.mockResolvedValue(undefined);

      const result = await service.sendOrderMail(
        mockEmail,
        mockOrderId,
        emptyBuffer,
      );

      expect(mailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [
            {
              filename: `orden-${mockOrderId}.pdf`,
              content: emptyBuffer,
              contentType: 'application/pdf',
            },
          ],
        }),
      );

      expect(result).toEqual({
        message: `Correo enviado correctamente a ${mockEmail}`,
        status: 200,
      });
    });
  });
});