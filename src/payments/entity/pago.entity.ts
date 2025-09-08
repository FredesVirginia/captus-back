import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  CreateDateColumn,
} from 'typeorm';
import { Orden } from './order.entity';
import {  EstadoPagoEnum, MedioPagoEnum } from '../enums/PagosEnum';


@Entity()
export class Pago {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Orden, (orden) => orden.pago)
  orden: Orden;

  @Column('decimal', { precision: 10, scale: 2 })
  monto: number;

  @Column({ type: 'enum', enum: MedioPagoEnum , default : MedioPagoEnum.TARJETA })
  metodo: MedioPagoEnum;

  @Column({ type: 'enum', enum:EstadoPagoEnum , default : EstadoPagoEnum.PENDIENTE})
  estado: EstadoPagoEnum;

  @CreateDateColumn()
  fechaPago: Date;
}
