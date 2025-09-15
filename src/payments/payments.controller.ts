import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Response } from 'express';
import { OrderWithItems } from 'src/order/types/OrderTypes';
import { OrderService } from 'src/order/order.service';
import { CreateOrdenDto } from 'src/order/dtos/OrderDto';
import { MailService } from 'src/mailer/mailer.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly orderService: OrderService,
    private readonly mailerService: MailService,
  ) {}

  @Post('create')
  async createPayment(@Body() order: OrderWithItems) {
    return this.paymentsService.createPayment(order);
  }

  @Post('checkout')
  async checkout(@Body() createOrderDto: CreateOrdenDto) {
    const orden = await this.orderService.createOrder(
      createOrderDto.userId,
      createOrderDto.items,
    );

    const pdfBuffer = await this.orderService.printOrder(orden.id);

    await this.mailerService.sendOrderMail(
      'William-Champion@outlook.com', // el correo del dueño
      orden.id,
      pdfBuffer,
    );
   // const payment = await this.paymentsService.createPayment(orden);

    return {
      order: orden,
     
    };
  }
  // Mercado Pago enviará notificaciones aquí
  @Post('webhook')
  async webhook(@Req() req: Request, @Res() res: Response) {
    await this.paymentsService.handleWebhook(req.body);
    return res.status(200).send('ok');
  }

  @Get('success')
  paymentsSucefull() {
    return 'Payments SUCEES';
  }

  @Get('failure')
  paymentsFail() {
    return 'Payments SUCEES';
  }

  @Get('pending')
  paymentsPedding() {
    return 'Payments SUCEES';
  }
}
