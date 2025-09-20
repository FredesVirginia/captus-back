import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Orden } from './entity/order.entity';
import { OrdenItem } from './entity/orderitem.entity';
import { Pago } from './entity/pago.entity';
import { ConfigModule } from '@nestjs/config';
import { OrderModule } from 'src/order/order.module';
import { MailModule } from 'src/mailer/mailer.module';
import { Floor } from 'src/floors/entity/floor.entity';

@Module({
imports: [ConfigModule , PaymentsModule , OrderModule , TypeOrmModule.forFeature([Pago, Orden , Floor]), MailModule ],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports : [PaymentsService]
})
export class PaymentsModule {}
