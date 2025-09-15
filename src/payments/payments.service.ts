import { Injectable , Logger} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Pago } from './entity/pago.entity';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Vexor } from 'vexor';
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private vexorClient;


  constructor(private readonly configService: ConfigService) {
    this.vexorClient = new Vexor({
    projectId: this.configService.get<string>('VEXOR_PROJECT'),
    publishableKey: this.configService.get<string>('VEXOR_PUBLISHABLE_KEY'),
    secretKey: this.configService.get<string>('VEXOR_SECRET_KEY'),
  });
  }



  async createPayment(orderId: number, amount: number) {
    try {
      const payment = await this.vexorClient.payments.create({
        amount,
        currency: 'ARS', // o USD según config
        description: `Order #${orderId}`,
        metadata: { orderId },
        redirectUrls: {
          success: this.configService.get<string>('PAYMENT_SUCCESS_URL'),
          failure: this.configService.get<string>('PAYMENT_FAILURE_URL'),
          pending: this.configService.get<string>('PAYMENT_PENDING_URL'),
        },
      });

      return payment;
    } catch (err) {
      this.logger.error(`Error creando pago: ${err.message}`);
      throw err;
    }
  }

  async handleWebhook(data: any) {
    this.logger.log('Webhook recibido', data);

    // Aquí actualizas la orden en tu DB
    return { received: true };
  }

}
