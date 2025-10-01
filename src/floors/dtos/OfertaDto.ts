import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsArray, IsDate, IsString } from 'class-validator';

export class CreateOfertaDto {

  @IsString()
  nombre: string;

  @IsNumber()
  descuento: number;

  @IsDate()

  fechaInicio: Date;

  @IsDate()

  fechaFin: Date;

  @IsArray()
  @IsNumber({}, { each: true })
  plantasIds: number[];
}
