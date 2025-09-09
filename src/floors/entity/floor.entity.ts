import { User } from 'src/users/entity/user.entity';
import {
  Column,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn
} from 'typeorm';
import { FloorEnum } from '../enums/FloorEnum';


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


}
