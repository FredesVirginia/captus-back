import {
    BadRequestException,
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
      console.log("Error" , error)
    }
  }

 
}
