import { IsNotEmpty, IsNumber, IsEnum, IsUrl } from 'class-validator';
import { FloorEnum } from '../enums/FloorEnum';
import { Transform } from 'class-transformer';

export class CreateFloorDto {
  @IsNotEmpty()
  nombre: string;

  @IsNotEmpty()
  descripcion: string;

  @Transform(({ value }) => {
    console.log('Categoria recibida:', value, 'tipo:', typeof value);
    return value;
  })
  @IsEnum(FloorEnum)
  categoria: FloorEnum

  @IsNumber()
  precio: number;

  @IsNumber()
  stock: number;

  
}

export class UpdateFloorDto extends CreateFloorDto {}
