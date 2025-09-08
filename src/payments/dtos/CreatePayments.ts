import { IsEnum, IsNumber } from 'class-validator';

export class CreatePagoDto {
  @IsNumber()
  ordenId: number;

  @IsNumber()
  monto: number;

  @IsEnum(['tarjeta', 'transferencia'])
  metodo: string;
}
