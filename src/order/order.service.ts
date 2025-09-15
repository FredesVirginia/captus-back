import { Injectable, NotFoundException } from '@nestjs/common';
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
      if (!user) throw new NotFoundException('Usuario no encontrado');

      // 2️⃣ Crear la orden padre (sin items aún)
      const order = this.orderRepo.create({
        user,
        estado: PagoEnum.PENDIENTE,
        total: 0,
      });

      // Guardamos la orden para que tenga ID
      await this.orderRepo.save(order);

      // 3️⃣ Crear los items y calcular el total
      let total = 0;
      const orderItems: OrdenItem[] = [];

      for (const itemDto of itemsDto) {
        const planta = await this.plantRepo.findOne({
          where: { id: itemDto.plantId },
        });
        if (!planta)
          throw new NotFoundException(
            `Planta con id ${itemDto.plantId} no encontrada`,
          );

        const orderItem = this.orderItemRepo.create({
          orden: order, // Vinculamos con la orden ya creada
          planta,
          cantidad: itemDto.quantity,
          precioUnitario: planta.precio,
        });

        total += planta.precio * itemDto.quantity;
        orderItems.push(orderItem);
      }

      // 4️⃣ Guardar los items
      await this.orderItemRepo.save(orderItems);

      // 5️⃣ Actualizar total en la orden
      order.total = total;
      await this.orderRepo.save(order);

      const fullOrder = await this.orderRepo.findOne({
        where: { id: order.id },
        relations: ['items', 'items.planta'],
        select: ['id'], // solo seleccionamos el id de la orden
      });

      // Map para mantener solo id y items
      return {
        id: fullOrder!.id,
        items: fullOrder!.items.map((item) => ({
          id: item.id,
          planta: {
            ...item.planta,
            precio: item.planta.precio.toString(), // 👈 convertimos number a string
          },
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario.toString(), // 👈 convertimos number a string
        })),
      };
    } catch (error) {
      throw new NotFoundException('Error al crear order' , error);
    }
  }

  async getOrderWithItems(orderId: number) {
    try {
      const orderData = await this.orderRepo.findOne({
        where: { id: orderId },
      });
      if (orderData) return orderData;
      return 'No se encontro order';
    } catch (error) {
      console.log('Error', error);
      return Error;
    }
  }

  async printOrder(orderId: number): Promise<Buffer> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['user', 'items', 'items.planta'],
    });
    if (!order) throw new NotFoundException('Orden no encontrada');

    const docDef = await buildOrderTemplate(order);
    return this.printService.generatePdf(docDef);
  }
}
