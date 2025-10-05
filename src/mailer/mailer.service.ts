import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
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

    this.logger.log(`📧 Correo enviado correctamente a ${to} para la orden #${orderId}`);

    return {
      message: `Correo enviado correctamente a ${to}`,
      status: 200,
    };
  } catch (error) {
    this.logger.error('❌ Error enviando correo:', error);

    // Si el error es una HttpException ya lanzada, la repropagamos
    if (error instanceof HttpException) throw error;

    // Si el error viene del mailer (por ejemplo, credenciales incorrectas o fallo de conexión)
    throw new HttpException(
      {
        code: 'EMAIL_SEND_FAILED',
        message: 'No se pudo enviar el correo electrónico. Inténtalo más tarde.',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

}
