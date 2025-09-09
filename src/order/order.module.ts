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

@Module({
    imports : [TypeOrmModule.forFeature([Orden , OrdenItem , User , Floor ]) , UsersModule , FloorsModule], 
  controllers: [OrderController],
  providers: [OrderService]
})
export class OrderModule {}
