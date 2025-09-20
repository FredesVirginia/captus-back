import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ComboItem } from "./comboItem.entity";

@Entity()
export class Combo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 100 })
  nombre: string; // Ej: "Combo Suculentas", "Pack de 3 Cactus"

  @Column('text', { nullable: true })
  descripcion: string;

  @Column('decimal', { precision: 10, scale: 2 })
  precio: number; // 👈 puede ser fijo o calculado

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => ComboItem, (item) => item.combo, { cascade: true })
  items: ComboItem[];
}