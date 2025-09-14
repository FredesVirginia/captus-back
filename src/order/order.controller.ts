import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrdenDto } from './dtos/OrderDto';
import { Response } from 'express';

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

  @Get(':id/print')
async printOrder(@Param('id') id: number, @Res() res: Response) {
  const pdfBuffer = await this.ordenService.printOrder(+id);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename=orden-${id}.pdf`,
    'Content-Length': pdfBuffer.length,
  });
  res.end(pdfBuffer);
}
}
