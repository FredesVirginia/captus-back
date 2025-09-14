import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsNumber, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  nombre: string;

  @IsEmail()
  email: string;

  @Type(()=>Number)
  @IsNumber()
  phone : number

  @MinLength(6)
  password: string;
}

export class UpdateUserDto {
  @IsNotEmpty()
  nombre?: string;

  @IsEmail()
  email?: string;

  password?: string;
}
