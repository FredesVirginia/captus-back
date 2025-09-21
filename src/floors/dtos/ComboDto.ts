import { IsString, IsNumber, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateComboItemDto } from './ComboItemDto';


export class CreateComboDto {
  @IsString()
  nombre: string;

  @IsString()
  descripcion: string;

  @IsNumber()
  precio: number; // Precio total del combo (puede ser suma o ajustado por el admin)

  @IsBoolean()
  activo: boolean;
  
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateComboItemDto)
  items: CreateComboItemDto[];
}
