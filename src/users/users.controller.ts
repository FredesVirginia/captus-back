import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateUserDto } from './dtos/CreateuserDto';
import { UserService } from './users.service';


@Controller('users')
export class UserController {
    constructor (private readonly userService : UserService){}

   
    @Post('create-user')
    async createUser(@Body() userTodoListDto : CreateUserDto){
        const newTodoList = await this.userService.createUser(userTodoListDto)
        return newTodoList
    }

 
    @Get('get-all-user')
    async getAllUser(){
        return await this.userService.getAllUser()
    }

  

   
}