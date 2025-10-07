import { HttpException, HttpStatus } from '@nestjs/common';
import { UserService } from './users.service';
import { Repository } from 'typeorm';
import { User } from './entity/user.entity';
import { Favorito } from './entity/favoritos.entity';
import { Floor } from 'src/floors/entity/floor.entity';
import { CreateFavoritoDto } from './dtos/CreateFavoritoDto';

describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<Repository<User>>;
  let favoritoRepo: jest.Mocked<Repository<Favorito>>;
  let floorRepo: jest.Mocked<Repository<Floor>>;

  beforeEach(() => {
    userRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    } as any;

    favoritoRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      find: jest.fn(),
    } as any;

    floorRepo = {
      findOne: jest.fn(),
    } as any;

    service = new UserService(userRepository, favoritoRepo, floorRepo);
  });

  // -----------------------------------------------
  // 🧩 getAllUser()
  // -----------------------------------------------
  describe('getAllUser', () => {
    it('should return all users', async () => {
      const mockUsers = [{ id: 1 }, { id: 2 }] as User[];
      userRepository.find.mockResolvedValue(mockUsers);

      const result = await service.getAllUser();
      expect(result).toEqual(mockUsers);
      expect(userRepository.find).toHaveBeenCalled();
    });

    it('should throw HttpException on error', async () => {
      userRepository.find.mockRejectedValue(new Error('DB error'));

      await expect(service.getAllUser()).rejects.toBeInstanceOf(HttpException);
      await expect(service.getAllUser()).rejects.toMatchObject({
        response: {
          code: 'GET_USERS_ERROR',
          message: 'Ocurrió un error al obtener los usuarios',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        },
      });
    });
  });

  // -----------------------------------------------
  // 🧩 addFavoritos()
  // -----------------------------------------------
  describe('addFavoritos', () => {
    const dto: CreateFavoritoDto = { userId: 1, floorId: 2 };

    it('should throw if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.addFavoritos(dto)).rejects.toMatchObject({
        response: {
          code: 'USER_NOT_FOUND',
          message: 'El usuario no existe',
        },
      });
    });

    it('should throw if floor not found', async () => {
      userRepository.findOne.mockResolvedValue({ id: 1 } as User);
      floorRepo.findOne.mockResolvedValue(null);

      await expect(service.addFavoritos(dto)).rejects.toMatchObject({
        response: {
          code: 'FLOOR_NOT_FOUND',
          message: 'La planta no existe',
        },
      });
    });

    it('should create, save, and return favorito', async () => {
      const mockUser = { id: 1 } as User;
      const mockFloor = { id: 2 } as Floor;
      const mockFav = { id: 10, user: mockUser, floor: mockFloor } as Favorito;

      userRepository.findOne.mockResolvedValue(mockUser);
      floorRepo.findOne.mockResolvedValue(mockFloor);
      favoritoRepo.create.mockReturnValue(mockFav);
      favoritoRepo.save.mockResolvedValue(mockFav);
      favoritoRepo.findOne.mockResolvedValue({ ...mockFav, floor: mockFloor });

      const result = await service.addFavoritos(dto);

      expect(favoritoRepo.create).toHaveBeenCalledWith({ user: mockUser, floor: mockFloor });
      expect(favoritoRepo.save).toHaveBeenCalledWith(mockFav);
      expect(favoritoRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockFav.id },
        relations: ['floor'],
      });
      expect(result).toEqual({ ...mockFav, floor: mockFloor });
    });
  });

  // -----------------------------------------------
  // 🧩 removeFavorito()
  // -----------------------------------------------
  describe('removeFavorito', () => {
    const dto: CreateFavoritoDto = { userId: 1, floorId: 2 };

    it('should throw if favorito not found', async () => {
      favoritoRepo.findOne.mockResolvedValue(null);

      await expect(service.removeFavorito(dto)).rejects.toMatchObject({
        response: {
          code: 'FAVORITO_NOT_FOUND',
          message: 'El favorito no existe',
        },
      });
    });

    it('should remove and return favorito', async () => {
      const mockFav = { id: 1 } as Favorito;
      favoritoRepo.findOne.mockResolvedValue(mockFav);
      favoritoRepo.remove.mockResolvedValue(mockFav);

      const result = await service.removeFavorito(dto);
      expect(favoritoRepo.findOne).toHaveBeenCalledWith({
        where: { user: { id: dto.userId }, floor: { id: dto.floorId } },
      });
      expect(favoritoRepo.remove).toHaveBeenCalledWith(mockFav);
      expect(result).toBe(mockFav);
    });
  });

  // -----------------------------------------------
  // 🧩 getFavorites()
  // -----------------------------------------------
  describe('getFavorites', () => {
    it('should throw if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getFavorites(1)).rejects.toMatchObject({
        response: {
          code: 'USER_NOT_FOUND',
          message: 'El usuario no existe',
        },
      });
    });

    it('should return favorites ordered by fechaAgregado DESC', async () => {
      const mockUser = { id: 1 } as User;
      const mockFavorites = [{ id: 1 }, { id: 2 }] as Favorito[];

      userRepository.findOne.mockResolvedValue(mockUser);
      favoritoRepo.find.mockResolvedValue(mockFavorites);

      const result = await service.getFavorites(1);

      expect(favoritoRepo.find).toHaveBeenCalledWith({
        where: { user: { id: 1 } },
        relations: ['floor'],
        order: { fechaAgregado: 'DESC' },
      });
      expect(result).toEqual(mockFavorites);
    });
  });
});
