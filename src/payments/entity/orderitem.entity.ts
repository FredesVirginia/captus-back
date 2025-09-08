import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { Orden } from './order.entity';
import {Floor} from "../../floors/entity/floor.entity"


@Entity()
export class OrdenItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Orden, (orden) => orden.items)
  orden: Orden;

  @ManyToOne(() => Floor)
  planta: Floor;

  @Column()
  cantidad: number;

  @Column('decimal', { precision: 10, scale: 2 })
  precioUnitario: number;
}
