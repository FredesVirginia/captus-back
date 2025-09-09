import { IsNotEmpty, IsNumber, IsEnum, IsUrl } from 'class-validator';

export class CreateFloorDto {
  @IsNotEmpty()
  nombre: string;

  @IsNotEmpty()
  descripcion: string;

  @IsEnum(['cactus', 'suculenta'])
  categoria: 'cactus' | 'suculenta';

  @IsNumber()
  precio: number;

  @IsNumber()
  stock: number;

  
}

export class UpdateFloorDto extends CreateFloorDto {}
