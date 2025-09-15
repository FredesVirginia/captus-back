import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Orden } from './entity/order.entity';
import { OrdenItem } from './entity/orderitem.entity';
import { UsersModule } from 'src/users/users.module';
import { FloorsModule } from 'src/floors/floors.module';
import { User } from 'src/users/entity/user.entity';
import { Floor } from 'src/floors/entity/floor.entity';
import { PrintModule } from 'src/print/print.module';
import { PaymentsModule } from 'src/payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Orden, OrdenItem, User, Floor]),
    UsersModule,
    FloorsModule,
    PrintModule,
   
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
