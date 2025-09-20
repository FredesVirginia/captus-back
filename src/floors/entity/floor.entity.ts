import { User } from 'src/users/entity/user.entity';
import {
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn
} from 'typeorm';
import { FloorEnum } from '../enums/FloorEnum';
import { Oferta } from './oferta.entity';
import { ComboItem } from './comboItem.entity';


@Entity()
export class Floor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'enum', enum: FloorEnum , default : FloorEnum.CAPTU })
  categoria:  FloorEnum

  @Column('decimal', { precision: 10, scale: 2 })
  precio: number;

  @Column()
  stock: number;

  @Column()
  imagenUrl: string;

  @ManyToMany(() => User, (user) => user.favoritos)
  favoritedBy: User[];

    @ManyToOne(() => Oferta, (oferta) => oferta.plantas, { nullable: true })
  oferta?: Oferta;

  @OneToMany(() => ComboItem, (comboItem) => comboItem.planta)
comboItems: ComboItem[];


}
