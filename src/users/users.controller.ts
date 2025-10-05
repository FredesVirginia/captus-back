import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { UserService } from './users.service';
import { CreateFavoritoDto } from './dtos/CreateFavoritoDto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('get-all-user')
  async getAllUser() {
    return await this.userService.getAllUser();
  }

  @Get('favorites/:userId')
  async getFavorites(@Param('userId') userId: number) {
    return await this.userService.getFavorites(userId);
  }

  @Post('favorites')
  async addFavorite(@Body() createFavoritoDto: CreateFavoritoDto) {
    return await this.userService.addFavoritos(createFavoritoDto);
  }


  @Delete('favorites/:userId/:floorId')
  async deleteFavorite(
    @Param('userId') userId: number,
    @Param('floorId') floorId: number,
  ) {
    return await this.userService.removeFavorito({ userId, floorId } as CreateFavoritoDto);
  }
}
