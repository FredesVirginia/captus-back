import { CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';
import { Floor } from 'src/floors/entity/floor.entity';

@Entity()
export class Favorito {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.favoritos, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Floor, (floor) => floor.favoritos, { onDelete: 'CASCADE' })
  floor: Floor;

  @CreateDateColumn()
  fechaAgregado: Date;
}
