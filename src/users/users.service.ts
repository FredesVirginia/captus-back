import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { User } from './entity/user.entity';
import { Favorito } from './entity/favoritos.entity';
import { CreateFavoritoDto } from './dtos/CreateFavoritoDto';
import { Floor } from 'src/floors/entity/floor.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Favorito)
    private readonly favoritoRepo: Repository<Favorito>,
    @InjectRepository(Floor)
    private readonly floorRepo: Repository<Floor>,
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

  async addFavoritos(dto: CreateFavoritoDto) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: dto.userId },
      });
      const floor = await this.floorRepo.findOne({
        where: { id: dto.floorId },
      });
      if (!user) {
        throw new HttpException(
          {
            code: 'USER_NOT_FOUND',
            message: 'El usuario no existe',
            status: HttpStatus.NOT_FOUND,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      if (!floor) {
        throw new HttpException(
          {
            code: 'FLOOR_NOT_FOUND',
            message: 'La planta no existe',
            status: HttpStatus.NOT_FOUND,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      const favorito = this.favoritoRepo.create({ user, floor });
      const saved = await this.favoritoRepo.save(favorito);
      return await this.favoritoRepo.findOne({
        where: { id: saved.id },
        relations: ['floor'],
      });
    } catch (error) {}
  }

  async  removeFavorito ( dto : CreateFavoritoDto){
    const { userId, floorId } = dto;

    const favorito = await this.favoritoRepo.findOne({
      where : { user : { id : userId }, floor : { id : floorId } }
    })
    if (!favorito) {
      throw new HttpException(
        {
          code: 'FAVORITO_NOT_FOUND',
          message: 'El favorito no existe',
          status: HttpStatus.NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }
    return this.favoritoRepo.remove(favorito);
  }

   async getFavorites(userId: number): Promise<Favorito[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new HttpException(
        {
          code: 'USER_NOT_FOUND',
          message: 'El usuario no existe',
          status: HttpStatus.NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return this.favoritoRepo.find({
      where: { user: { id: userId } },
      relations: ['floor'],
      order: { fechaAgregado: 'DESC' },
    });
  }
}
