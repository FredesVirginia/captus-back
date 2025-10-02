import { IsEmail, IsEnum, IsNumber, IsString, MinLength } from 'class-validator';
import { UserEnum } from 'src/users/enums/user.enum';

export class AuthDto{

    @IsString()
    nombre : string

    @IsString()
    phone : string
    @IsEmail()
    email:string;

    @IsEnum(UserEnum)
    role : UserEnum

    @IsString()
    @MinLength(6)
    password : string
}