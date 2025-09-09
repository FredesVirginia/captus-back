import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Orden } from './entity/order.entity';
import { OrdenItem } from './entity/orderitem.entity';
import { Pago } from './entity/pago.entity';

@Module({

  providers: [PaymentsService],
  controllers: [PaymentsController]
})
export class PaymentsModule {}
