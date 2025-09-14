import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {Orden} from "./entity/order.entity"
import { OrdenItem } from './entity/orderitem.entity';
import { User } from 'src/users/entity/user.entity';
import { Floor } from 'src/floors/entity/floor.entity';
import { CreateOrdenDto, OrderItemDto } from './dtos/OrderDto';
import { PagoEnum } from './enums/PagosEnum';
import { PrintService } from 'src/print/print.service';
import { buildOrderTemplate } from 'src/print/templates/ordenTemplate';
@Injectable()
export class OrderService {

     constructor(
    @InjectRepository(Orden) private readonly orderRepo: Repository<Orden>,
    @InjectRepository(OrdenItem) private readonly orderItemRepo: Repository<OrdenItem>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Floor) private readonly plantRepo: Repository<Floor>,
     private readonly printService: PrintService,
  ) {}





  async createOrder(userId: number, itemsDto: OrderItemDto[]) {
    // 1️⃣ Buscar al usuario
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
      const planta = await this.plantRepo.findOne({ where: { id: itemDto.plantId } });
      if (!planta) throw new NotFoundException(`Planta con id ${itemDto.plantId} no encontrada`);

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
    return await this.orderRepo.save(order);
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
