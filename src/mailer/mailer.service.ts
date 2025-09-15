import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
@Injectable()
export class MailService {


     private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendOrderMail(to: string, orderId: number, pdfBuffer: Buffer) {
    try {
      await this.mailerService.sendMail({
        to,
        subject: `Nueva orden recibida - #${orderId}`,
        text: `Se ha registrado una nueva orden con ID ${orderId}. Encuentra el PDF adjunto.`,
        attachments: [
          {
            filename: `orden-${orderId}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });
      this.logger.log(`Correo enviado a ${to} para la orden #${orderId}`);
    } catch (error) {
      this.logger.error('Error enviando correo', error);
      throw error;
    }
  }
}
