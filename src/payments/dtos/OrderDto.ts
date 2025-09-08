import { IsArray, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateOrdenDto {
  @IsArray()
  items: { plantaId: number; cantidad: number }[];

  @IsNumber()
  userId: number;
}
