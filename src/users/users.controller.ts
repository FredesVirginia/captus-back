import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateUserDto } from './dtos/CreateuserDto';
import { UserService } from './users.service';


@Controller('users')
export class UserController {
    constructor (private readonly userService : UserService){}

   
    

 
    @Get('get-all-user')
    async getAllUser(){
        return await this.userService.getAllUser()
    }

  

   
}