import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderWithItems } from 'src/order/types/OrderTypes';
import { Repository } from 'typeorm';
import vexor from 'vexor';
import { Orden } from './entity/order.entity';
import { Pago } from './entity/pago.entity';
import { EstadoPagoEnum, MedioPagoEnum, PagoEnum } from './enums/PagosEnum';
import { Floor } from 'src/floors/entity/floor.entity';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private vexorClient;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Pago) private readonly pagoRepo: Repository<Pago>,
    @InjectRepository(Orden) private readonly orderRepo: Repository<Orden>,
    @InjectRepository(Floor) private readonly floorRepo: Repository<Floor>,
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

      let payment;
      try {
        payment = await this.vexorClient.pay.mercadopago({
          items: paymentItems,
          metadata: { orderId: order.id },
          redirectUrls: {
            success: 'http://localhost:3000/payments/success',
            failure: this.configService.get<string>('PAYMENT_FAILURE_URL'),
            pending: this.configService.get<string>('PAYMENT_PENDING_URL'),
          },
        });
      } catch (paymentError) {
        console.error('❌ Error al crear pago con Vexor:', paymentError);
        throw new HttpException(
          {
            code: 'PAYMENT_CREATION_FAILED',
            message: 'No se pudo crear el pago. Intenta nuevamente.',
            status: HttpStatus.INTERNAL_SERVER_ERROR,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

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
      console.error('❌ Error en createPayment():', err);
      if (err instanceof HttpException) throw err;

      throw new HttpException(
        {
          code: 'CREATE_PAYMENT_ERROR',
          message: 'Ocurrió un error inesperado al crear el pago',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async handleWebhook(data: any) {
    try {
      this.logger.log('Webhook recibido', data);

      const { orderId, status, paymentId, amount, method } = data;
      console.log('STATUS', status);

      const pago = await this.pagoRepo.findOne({
        where: { orden: { id: orderId } },
        relations: ['orden'],
      });

      if (!pago) {
        this.logger.warn(
          `No se encontró un pago para la orden ${orderId}, creando uno...`,
        );
        const orden = await this.orderRepo.findOne({ where: { id: orderId } });

        if (!orden) {
          throw new HttpException(
            {
              code: 'ORDER_NOT_FOUND',
              message: 'Orden no encontrada',
              status: HttpStatus.NOT_FOUND,
            },
            HttpStatus.NOT_FOUND,
          );
        }

        const nuevoPago = this.pagoRepo.create({
          orden,
          monto: amount,
          metodo: method as MedioPagoEnum,
          estado: status as EstadoPagoEnum,
        });

        await this.pagoRepo.save(nuevoPago);
      } else {
        // Actualizar estado del pago
        pago.estado = status as EstadoPagoEnum;
        await this.pagoRepo.save(pago);
      }

      // Si el pago fue aprobado, actualizar la orden y stock
      if (status === EstadoPagoEnum.CONFIRMADO) {
        const orden = await this.orderRepo.findOne({
          where: { id: orderId },
          relations: ['items'],
        });

        if (!orden) {
          throw new HttpException(
            {
              code: 'ORDER_NOT_FOUND',
              message: 'Orden no encontrada para actualizar',
              status: HttpStatus.NOT_FOUND,
            },
            HttpStatus.NOT_FOUND,
          );
        }

        orden.estado = PagoEnum.PAGADO;
        await this.orderRepo.save(orden);

        for (const floor of orden.items) {
          const floorFound = await this.floorRepo.findOne({
            where: { id: floor.id },
          });

          if (floorFound) {
            floorFound.stock -= floor.cantidad;
            await this.floorRepo.save(floorFound);
            console.log('Se actualizó la Planta', floorFound);
          } else {
            this.logger.warn(
              `Planta con id ${floor.id} no encontrada al actualizar stock`,
            );
          }
        }
      }

      return { received: true };
    } catch (error) {
      console.error('❌ Error en handleWebhook():', error);

      if (error instanceof HttpException) throw error;

      throw new HttpException(
        {
          code: 'WEBHOOK_PROCESSING_ERROR',
          message: 'Ocurrió un error al procesar el webhook',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
