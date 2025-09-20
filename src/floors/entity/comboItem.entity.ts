import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Combo } from "./combo.entity";
import { Floor } from "./floor.entity";

@Entity()
export class ComboItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Combo, (combo) => combo.items)
  combo: Combo;

  @ManyToOne(() => Floor)
  planta: Floor;

  @Column('int')
  cantidad: number;
}