import { Body, Controller, Post } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrdenDto } from './dtos/OrderDto';

@Controller('order')
export class OrderController {

     constructor(private readonly ordenService: OrderService) {}

  @Post()
  async createOrder(@Body() createOrderDto: CreateOrdenDto ) {
    return this.ordenService.createOrder(
      createOrderDto.userId,
      createOrderDto.items,
    );
  }
}
