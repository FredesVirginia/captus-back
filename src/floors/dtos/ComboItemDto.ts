import { IsNumber, Min } from 'class-validator';

export class CreateComboItemDto {
  

  @IsNumber()
  plantaId: number;

  @IsNumber()
  @Min(1)
  cantidad: number;
}
