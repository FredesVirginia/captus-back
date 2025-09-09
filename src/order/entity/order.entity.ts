import { User } from 'src/users/entity/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { OrdenItem } from './orderitem.entity';
import { Pago } from './pago.entity';
import { PagoEnum } from '../enums/PagosEnum';

@Entity()
export class Orden {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.ordenes)
  user: User;

  @OneToMany(() => OrdenItem, (item) => item.orden, { cascade: true })
  items: OrdenItem[];

  @OneToOne(() => Pago, (pago) => pago.orden)
  @JoinColumn()
  pago: Pago;

  @Column({
    type: 'enum',
    enum: PagoEnum,
    default: PagoEnum.PENDIENTE,
  })
  estado: PagoEnum;

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @CreateDateColumn()
  fecha: Date;
}
