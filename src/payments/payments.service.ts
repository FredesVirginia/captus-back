import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderWithItems } from 'src/order/types/OrderTypes';
import { Repository } from 'typeorm';
import vexor from 'vexor';
import { Orden } from './entity/order.entity';
import { Pago } from './entity/pago.entity';
import { EstadoPagoEnum, MedioPagoEnum, PagoEnum } from './enums/PagosEnum';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private vexorClient;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Pago) private readonly pagoRepo: Repository<Pago>,
    @InjectRepository(Orden) private readonly orderRepo: Repository<Orden>,
  ) {
    try {
      this.logger.log('Inicializando Vexor client...');

      const { Vexor } = vexor;

      this.vexorClient = new Vexor({
        projectId: this.configService.get<string>('VEXOR_PROJECT'),
        publishableKey: this.configService.get<string>('VEXOR_PUBLISHABLE_KEY'),
        secretKey: this.configService.get<string>('VEXOR_SECRET_KEY'),
      });
    } catch (error) {
      this.logger.error('Error inicializando Vexor:', error);
      throw error;
    }
  }

  async createPayment(order: OrderWithItems) {
    try {
      // Mapear los items de la orden al formato que requiere Vexor
      const paymentItems = order.items.map((item) => ({
        title: item.planta.nombre,
        unit_price: Number(item.precioUnitario),
        quantity: item.cantidad,
      }));

      this.logger.log({
        success: this.configService.get<string>('PAYMENT_SUCCESS_URL'),
        failure: this.configService.get<string>('PAYMENT_FAILURE_URL'),
        pending: this.configService.get<string>('PAYMENT_PENDING_URL'),
      });
      const payment = await this.vexorClient.pay.mercadopago({
        items: paymentItems,
        // opcional: metadata o redirecciones
        metadata: { orderId: order.id },
        redirectUrls: {
          success: 'http://localhost:3000/payments/success',
          failure: this.configService.get<string>('PAYMENT_FAILURE_URL'),
          pending: this.configService.get<string>('PAYMENT_PENDING_URL'),
        },
      });

      const pago = this.pagoRepo.create({
        orden: { id: order.id } as Orden,
        monto: Number(
          order.items.reduce(
            (acc, item) => acc + Number(item.precioUnitario) * item.cantidad,
            0,
          ),
        ),
        metodo: MedioPagoEnum.TARJETA,
        estado: EstadoPagoEnum.PENDIENTE,
      });
      await this.pagoRepo.save(pago);

      await this.orderRepo.update(order.id, { pago });

      return { ...payment, pagoId: pago.id };
    } catch (err) {
      this.logger.error(`Error creando pago: ${err.message}`);
      throw err;
    }
  }

  async handleWebhook(data: any) {
    this.logger.log('Webhook recibido', data);

    const { orderId, status, paymentId, amount, method } = data; // dependé de cómo Vexor te mande los datos
    
   
    const pago = await this.pagoRepo.findOne({
      where: { orden: { id: orderId } },
      relations: ['orden'],
    });

    if (!pago) {
      this.logger.warn(
        `No se encontró un pago para la orden ${orderId}, creando uno...`,
      );
      const orden = await this.orderRepo.findOne({ where: { id: orderId } });
      if (!orden) throw new NotFoundException('Orden no encontrada');

      const nuevoPago = this.pagoRepo.create({
        orden,
        monto: amount,
        metodo: method as MedioPagoEnum,
        estado: status as EstadoPagoEnum,
      });

      await this.pagoRepo.save(nuevoPago);
    } else {
      // 2️⃣ Actualizás el estado del pago
      pago.estado = status as EstadoPagoEnum;
      await this.pagoRepo.save(pago);
    }

    // 3️⃣ Si el pago fue aprobado, actualizás la orden
    if (status === EstadoPagoEnum.CONFIRMADO) {
      const orden = await this.orderRepo.findOne({ where: { id: orderId } });
      if (orden) {
        orden.estado = PagoEnum.PAGADO;
        await this.orderRepo.save(orden);
      }
    }

    return { received: true };
  }
}
