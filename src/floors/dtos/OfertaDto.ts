import { IsDateString, IsNumber , IsArray } from 'class-validator';

export class CreateOfertaDto {
  @IsNumber()
  descuento: number;

  @IsDateString()
  fechaInicio: Date;

  @IsDateString()
  fechaFin: Date;

  @IsArray()
  @IsNumber({}, { each: true })
  plantasIds: number[];  
}
