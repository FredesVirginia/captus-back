import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Floor } from './floor.entity';

@Entity()
export class Oferta {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(() => Floor, (planta) => planta.oferta)
  plantas: Floor[];

  @Column('decimal', { precision: 5, scale: 2 })
  descuento: number;

  @Column({ type: 'timestamp' })
  fechaInicio: Date;

  @Column({ type: 'timestamp' })
  fechaFin: Date;
}
