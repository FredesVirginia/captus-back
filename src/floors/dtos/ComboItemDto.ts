import { IsNumber, Min } from 'class-validator';

export class CreateComboItemDto {
  @IsNumber()
  comboId: number;

  @IsNumber()
  plantaId: number;

  @IsNumber()
  @Min(1)
  cantidad: number;
}
