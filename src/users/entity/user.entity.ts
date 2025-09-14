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


@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({default : 0})
  phone:number

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

  @ManyToMany(() => Floor, (planta) => planta.favoritedBy)
  @JoinTable({
    name: 'favoritos',
    joinColumn: { name: 'userId' },
    inverseJoinColumn: { name: 'plantaId' },
  })
  favoritos: Floor[];

 
}
