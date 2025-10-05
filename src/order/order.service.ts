import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Orden } from './entity/order.entity';
import { OrdenItem } from './entity/orderitem.entity';
import { User } from 'src/users/entity/user.entity';
import { Floor } from 'src/floors/entity/floor.entity';
import { CreateOrdenDto, OrderItemDto } from './dtos/OrderDto';
import { PagoEnum } from './enums/PagosEnum';
import { PrintService } from 'src/print/print.service';
import { buildOrderTemplate } from 'src/print/templates/ordenTemplate';
import { OrderWithItems } from './types/OrderTypes';
import { PaymentsService } from 'src/payments/payments.service';
@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Orden) private readonly orderRepo: Repository<Orden>,
    @InjectRepository(OrdenItem)
    private readonly orderItemRepo: Repository<OrdenItem>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Floor) private readonly plantRepo: Repository<Floor>,
    private readonly printService: PrintService,
  ) {}

  async createOrder(
    userId: number,
    itemsDto: OrderItemDto[],
  ): Promise<OrderWithItems> {
    try {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new HttpException(
          { code: 'USER_NOT_FOUND', status: HttpStatus.NOT_FOUND },
          HttpStatus.NOT_FOUND,
        );
      }

      // 2️⃣ Crear la orden padre (sin items aún)
      const order = this.orderRepo.create({
        user,
        estado: PagoEnum.PENDIENTE,
        total: 0,
      });
      await this.orderRepo.save(order);

      // 3️⃣ Crear los items y calcular el total
      let total = 0;
      const orderItems: OrdenItem[] = [];

      for (const itemDto of itemsDto) {
        const planta = await this.plantRepo.findOne({
          where: { id: itemDto.plantId },
        });

        if (!planta) {
          throw new HttpException(
            {
              code: 'PLANT_NOT_FOUND',
              message: `Planta con id ${itemDto.plantId} no encontrada`,
              status: HttpStatus.NOT_FOUND,
            },
            HttpStatus.NOT_FOUND,
          );
        }

        const orderItem = this.orderItemRepo.create({
          orden: order,
          planta,
          cantidad: itemDto.quantity,
          precioUnitario: planta.precio,
        });

        total += planta.precio * itemDto.quantity;
        orderItems.push(orderItem);
      }

      await this.orderItemRepo.save(orderItems);

      // 5️⃣ Actualizar total en la orden
      order.total = total;
      await this.orderRepo.save(order);

      const fullOrder = await this.orderRepo.findOne({
        where: { id: order.id },
        relations: ['items', 'items.planta'],
        select: ['id'],
      });

      return {
        id: fullOrder!.id,
        items: fullOrder!.items.map((item) => ({
          id: item.id,
          planta: {
            ...item.planta,
            precio: item.planta.precio.toString(),
          },
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario.toString(),
        })),
      };
    } catch (error) {
      console.error('❌ Error en createOrder():', error);

      // Si ya es una HttpException personalizada, se relanza
      if (error instanceof HttpException) throw error;

      // Si fue un error desconocido, se encapsula
      throw new HttpException(
        {
          code: 'CREATE_ORDER_ERROR',
          message: 'No se pudo crear la orden. Intenta nuevamente.',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getOrderWithItems(orderId: number) {
    try {
      const orderData = await this.orderRepo.findOne({
        where: { id: orderId },
        relations: ['items', 'items.planta'],
      });

      if (!orderData) {
        throw new HttpException(
          {
            code: 'ORDER_NOT_FOUND',
            message: 'No se encontró la orden',
            status: HttpStatus.NOT_FOUND,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return { data: orderData, status: 200 };
    } catch (error) {
      console.error('❌ Error en getOrderWithItems():', error);

      if (error instanceof HttpException) throw error;

      throw new HttpException(
        {
          code: 'GET_ORDER_ERROR',
          message: 'Error al obtener la orden',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async printOrder(orderId: number): Promise<Buffer> {
    try {
      const order = await this.orderRepo.findOne({
        where: { id: orderId },
        relations: ['user', 'items', 'items.planta'],
      });

      if (!order) {
        throw new HttpException(
          {
            code: 'ORDER_NOT_FOUND',
            message: 'Orden no encontrada',
            status: HttpStatus.NOT_FOUND,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      const docDef = await buildOrderTemplate(order);

      try {
        return await this.printService.generatePdf(docDef);
      } catch (pdfError) {
        console.error('❌ Error generando PDF:', pdfError);
        throw new HttpException(
          {
            code: 'PDF_GENERATION_FAILED',
            message: 'No se pudo generar el PDF',
            status: HttpStatus.INTERNAL_SERVER_ERROR,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      console.error('❌ Error en printOrder():', error);

      if (error instanceof HttpException) throw error;

      throw new HttpException(
        {
          code: 'PRINT_ORDER_ERROR',
          message: 'Error al imprimir la orden',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
