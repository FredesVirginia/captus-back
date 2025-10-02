import { Floor } from 'src/floors/entity/floor.entity';
import { Orden } from 'src/payments/entity/order.entity';
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn
} from 'typeorm';
import { UserEnum } from '../enums/user.enum';
import { Favorito } from './favoritos.entity';


@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  phone:string

  @Column()
  nombre: string;

  @Column()
  password: string;

  @Column({ 
    type : "enum",
    enum : UserEnum,
    default: UserEnum.USER })
  role: UserEnum

  @OneToMany(() => Orden, (orden) => orden.user)
  ordenes: Orden[];

   @OneToMany(() => Favorito, (favorito) => favorito.user)
  favoritos: Favorito[];




 
}
