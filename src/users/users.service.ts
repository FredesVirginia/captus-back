import {
    BadRequestException,
    HttpException,
    HttpStatus,
    Injectable,
    InternalServerErrorException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { CreateUserDto } from './dtos/CreateuserDto';
import { User } from "./entity/user.entity";


@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  

async getAllUser() {
  try {
    const allUser = await this.userRepository.find();
    return allUser;
  } catch (error) {
    console.error('❌ Error en getAllUser():', error);

    throw new HttpException(
      {
        code: 'GET_USERS_ERROR',
        message: 'Ocurrió un error al obtener los usuarios',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}


 
}
