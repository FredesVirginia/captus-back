import { DataSource } from 'typeorm';


import * as dotenv from 'dotenv';
import { User } from './users/entity/user.entity';
import { Floor } from './floors/entity/floor.entity';
import { Pago } from './payments/entity/pago.entity';
import { Orden } from './payments/entity/order.entity';
import { OrdenItem } from './payments/entity/orderitem.entity';



dotenv.config();
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST!,
  port: +process.env.DB_PORT!,
  username: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
  entities: [User , Floor ,Pago , Orden , OrdenItem],
  migrations: ['src/migration/*.ts'],
  synchronize: false,
});