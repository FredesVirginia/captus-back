import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './users.controller';
import { UserService } from './users.service';
import { CreateFavoritoDto } from './dtos/CreateFavoritoDto';

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  const mockUserService = {
    getAllUser: jest.fn(),
    getFavorites: jest.fn(),
    addFavoritos: jest.fn(),
    removeFavorito: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);

    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------
  describe('getAllUser', () => {
    it('should return all users', async () => {
      const mockUsers = [{ id: 1, name: 'John' }];
      mockUserService.getAllUser.mockResolvedValue(mockUsers);

      const result = await controller.getAllUser();

      expect(service.getAllUser).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockUsers);
    });
  });

  // -------------------------------------------------------------------
  describe('getFavorites', () => {
    it('should return favorites of a user', async () => {
      const mockFavorites = [{ id: 1, floor: { name: 'Floor 1' } }];
      mockUserService.getFavorites.mockResolvedValue(mockFavorites);

      const result = await controller.getFavorites(1);

      expect(service.getFavorites).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockFavorites);
    });
  });

  // -------------------------------------------------------------------
  describe('addFavorite', () => {
    it('should add a favorite', async () => {
      const dto: CreateFavoritoDto = { userId: 1, floorId: 10 };
      const mockResponse = { id: 1, floor: { id: 10, name: 'Floor 10' } };
      mockUserService.addFavoritos.mockResolvedValue(mockResponse);

      const result = await controller.addFavorite(dto);

      expect(service.addFavoritos).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResponse);
    });
  });

  // -------------------------------------------------------------------
  describe('deleteFavorite', () => {
    it('should delete a favorite', async () => {
      const dto: CreateFavoritoDto = { userId: 1, floorId: 2 };
      const mockResponse = { success: true };
      mockUserService.removeFavorito.mockResolvedValue(mockResponse);

      const result = await controller.deleteFavorite(1, 2);

      expect(service.removeFavorito).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResponse);
    });
  });
});
