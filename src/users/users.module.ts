import { Module } from '@nestjs/common';
import { UserController } from './users.controller';
import { UserService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { Floor } from 'src/floors/entity/floor.entity';
import { Favorito } from './entity/favoritos.entity';


@Module({
  imports: [TypeOrmModule.forFeature([User , Floor , Favorito])], 
  controllers: [UserController],
  providers: [UserService]
})
export class UsersModule {}
