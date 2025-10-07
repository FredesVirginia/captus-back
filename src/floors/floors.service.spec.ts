import { Test, TestingModule } from '@nestjs/testing';
import { FloorsService } from './floors.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Floor } from './entity/floor.entity';
import { Oferta } from './entity/oferta.entity';
import { Combo } from './entity/combo.entity';
import { Repository } from 'typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { FloorEnum } from './enums/FloorEnum';
import * as vercelBlob from '@vercel/blob';

// Mock de @vercel/blob
jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
}));

describe('FloorsService', () => {
  let service: FloorsService;
  let floorRepository: jest.Mocked<Repository<Floor>>;
  let ofertaRepository: jest.Mocked<Repository<Oferta>>;
  let comboRepository: jest.Mocked<Repository<Combo>>;

  const mockFloorRepository = {
    save: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    findBy: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  };

  const mockOfertaRepository = {
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  };

  const mockComboRepository = {
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FloorsService,
        {
          provide: getRepositoryToken(Floor),
          useValue: mockFloorRepository,
        },
        {
          provide: getRepositoryToken(Oferta),
          useValue: mockOfertaRepository,
        },
        {
          provide: getRepositoryToken(Combo),
          useValue: mockComboRepository,
        },
      ],
    }).compile();

    service = module.get<FloorsService>(FloorsService);
    floorRepository = module.get(getRepositoryToken(Floor));
    ofertaRepository = module.get(getRepositoryToken(Oferta));
    comboRepository = module.get(getRepositoryToken(Combo));

    // Limpiar todos los mocks antes de cada test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadImage', () => {
    const mockFile = {
      originalname: 'test-image.jpg',
      buffer: Buffer.from('test'),
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    const mockFloorDto = {
      nombre: 'Planta Test',
      descripcion: 'Descripción test',
      categoria: FloorEnum.CAPTU,
      precio: 100,
      stock: 10,
    };

    it('should upload image and save floor successfully', async () => {
      const mockBlobUrl = 'https://blob.vercel-storage.com/test-image.jpg';
      (vercelBlob.put as jest.Mock).mockResolvedValue({ url: mockBlobUrl });

      const mockSavedFloor = {
        id: 1,
        ...mockFloorDto,
        imagenUrl: mockBlobUrl,
      };

      floorRepository.save.mockResolvedValue(mockSavedFloor as Floor);

      const result = await service.uploadImage(mockFile, mockFloorDto);

      expect(vercelBlob.put).toHaveBeenCalledWith(
        mockFile.originalname,
        mockFile.buffer,
        {
          access: 'public',
          token: process.env.BLOB_READ_WRITE_TOKEN,
          addRandomSuffix: true,
        },
      );
      expect(floorRepository.save).toHaveBeenCalledWith({
        ...mockFloorDto,
        imagenUrl: mockBlobUrl,
      });
      expect(result).toEqual({ data: mockSavedFloor });
    });

    it('should throw NO_FILE_PROVIDED error when file is not provided', async () => {
      await expect(service.uploadImage(null as any, mockFloorDto)).rejects.toThrow(
        new HttpException(
          { code: 'NO_FILE_PROVIDED', status: HttpStatus.BAD_REQUEST },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw BLOB_UPLOAD_FAILED error when blob upload fails', async () => {
      (vercelBlob.put as jest.Mock).mockRejectedValue(
        new Error('Upload failed'),
      );

      await expect(
        service.uploadImage(mockFile, mockFloorDto),
      ).rejects.toThrow(
        new HttpException(
          { code: 'BLOB_UPLOAD_FAILED', status: HttpStatus.INTERNAL_SERVER_ERROR },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });

    it('should throw DATABASE_SAVE_FAILED error when database save fails', async () => {
      const mockBlobUrl = 'https://blob.vercel-storage.com/test-image.jpg';
      (vercelBlob.put as jest.Mock).mockResolvedValue({ url: mockBlobUrl });
      floorRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(
        service.uploadImage(mockFile, mockFloorDto),
      ).rejects.toThrow(
        new HttpException(
          { code: 'DATABASE_SAVE_FAILED', status: HttpStatus.INTERNAL_SERVER_ERROR },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('getAllFloors', () => {
    const mockFloors: Partial<Floor>[] = [
      {
        id: 1,
        nombre: 'Planta 1',
        descripcion: 'Descripción 1',
        categoria: FloorEnum.CAPTU,
        precio: 100,
        stock: 10,
        imagenUrl: 'http://example.com/image1.jpg',
        oferta: undefined,
      },
      {
        id: 2,
        nombre: 'Planta 2',
        descripcion: 'Descripción 2',
        categoria: FloorEnum.CAPTU,
        precio: 200,
        stock: 5,
        imagenUrl: 'http://example.com/image2.jpg',
        oferta: undefined,
      },
    ];

    it('should return paginated floors without offers', async () => {
      floorRepository.findAndCount.mockResolvedValue([mockFloors as Floor[], 2]);

      const result: any = await service.getAllFloors(1, 5);

      expect(floorRepository.findAndCount).toHaveBeenCalledWith({
        relations: ['oferta'],
        skip: 0,
        take: 5,
      });
      expect(result).toEqual({
        data: mockFloors,
        page: 1,
        pageSize: 5,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should return floors with calculated discounted price', async () => {
      const floorsWithOffer: Partial<Floor>[] = [
        {
          ...mockFloors[0],
          oferta: {
            id: 1,
            nombre: 'Oferta Test',
            descuento: 20,
            fechaInicio: new Date(),
            fechaFin: new Date(),
          } as Oferta,
        },
      ];

      floorRepository.findAndCount.mockResolvedValue([floorsWithOffer as Floor[], 1]);

      const result: any = await service.getAllFloors(1, 5);

      expect(result.data[0]).toHaveProperty('precioFinal', '80.00');
    });

    it('should return empty array when no floors found', async () => {
      floorRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getAllFloors(1, 5);

      expect(result).toEqual([]);
    });

    it('should handle invalid page numbers', async () => {
      floorRepository.findAndCount.mockResolvedValue([mockFloors as Floor[], 2]);

      const result: any = await service.getAllFloors(-1, 5);

      expect(floorRepository.findAndCount).toHaveBeenCalledWith({
        relations: ['oferta'],
        skip: 0,
        take: 5,
      });
      expect(result.page).toBe(1);
    });

    it('should handle invalid pageSize', async () => {
      floorRepository.findAndCount.mockResolvedValue([mockFloors as Floor[], 2]);

      const result: any = await service.getAllFloors(1, 0);

      expect(floorRepository.findAndCount).toHaveBeenCalledWith({
        relations: ['oferta'],
        skip: 0,
        take: 5,
      });
      expect(result.pageSize).toBe(5);
    });

    it('should throw INVALID_DISCOUNT_VALUE when discount is not a number', async () => {
      const invalidFloor: Partial<Floor>[] = [
        {
          ...mockFloors[0],
          oferta: {
            id: 1,
            descuento: 'invalid' as any,
          } as Oferta,
        },
      ];

      floorRepository.findAndCount.mockResolvedValue([invalidFloor as Floor[], 1]);

      await expect(service.getAllFloors(1, 5)).rejects.toThrow(
        new HttpException(
          { code: 'INVALID_DISCOUNT_VALUE', status: HttpStatus.BAD_REQUEST },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should calculate pagination correctly for page 2', async () => {
      floorRepository.findAndCount.mockResolvedValue([mockFloors as Floor[], 10]);

      const result: any = await service.getAllFloors(2, 5);

      expect(floorRepository.findAndCount).toHaveBeenCalledWith({
        relations: ['oferta'],
        skip: 5,
        take: 5,
      });
      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(2);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(true);
    });
  });

  describe('getAllOfertas', () => {
    const mockPlanta: Floor = {
      id: 1,
      nombre: 'Planta Test',
      precio: 100,
      descripcion: 'Test',
      categoria: FloorEnum.CAPTU,
      stock: 10,
      imagenUrl: 'url',
    } as Floor;

    const mockOferta: Oferta = {
      id: 1,
      nombre: 'Oferta Test',
      descuento: 20,
      fechaInicio: new Date(),
      fechaFin: new Date(),
      plantas: [mockPlanta],
    } as Oferta;

    it('should return ofertas with calculated prices', async () => {
      ofertaRepository.find.mockResolvedValue([mockOferta]);

      const result = await service.getAllOfertas();

      expect(ofertaRepository.find).toHaveBeenCalledWith({
        relations: ['plantas'],
      });
      expect(result.data).toHaveLength(1);
      expect(result.ofertas).toHaveLength(1);
      expect(result.ofertas[0]).toHaveProperty('precioFinal', '80.00');
    });

    it('should return empty arrays when no ofertas found', async () => {
      ofertaRepository.find.mockResolvedValue([]);

      const result = await service.getAllOfertas();

      expect(result).toEqual({ data: [], ofertas: [] });
    });

    it('should throw INVALID_DISCOUNT_VALUE when discount is invalid', async () => {
      const invalidOferta = {
        ...mockOferta,
        descuento: NaN,
      };

      ofertaRepository.find.mockResolvedValue([invalidOferta]);

      await expect(service.getAllOfertas()).rejects.toThrow(
        new HttpException(
          { code: 'INVALID_DISCOUNT_VALUE', status: HttpStatus.BAD_REQUEST },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw NO_PLANTS_FOUND when oferta has no plants', async () => {
      const ofertaWithoutPlants = {
        ...mockOferta,
        plantas: [],
      };

      ofertaRepository.find.mockResolvedValue([ofertaWithoutPlants]);

      await expect(service.getAllOfertas()).rejects.toThrow(
        new HttpException(
          { code: 'NO_PLANTS_FOUND', status: HttpStatus.NOT_FOUND },
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('getAllCombos', () => {
    it('should return empty array when no combos found', async () => {
      comboRepository.find.mockResolvedValue([]);

      const result = await service.getAllCombos();

      expect(comboRepository.find).toHaveBeenCalledWith({
        relations: ['items', 'items.planta'],
      });
      expect(result).toEqual({ data: [] });
    });

    it('should return combos with items and plants', async () => {
      const mockCombos = [
        {
          id: 1,
          nombre: 'Combo Test',
          descripcion: 'Descripción',
          precio: 150,
          activo: true,
          items: [
            {
              id: 1,
              cantidad: 2,
              planta: {
                id: 1,
                nombre: 'Planta 1',
                precio: 100,
              },
            },
          ],
        },
      ];

      comboRepository.find.mockResolvedValue(mockCombos as Combo[]);

      const result = await service.getAllCombos();

      expect(result).toEqual({ data: mockCombos });
    });

    it('should throw GET_COMBOS_ERROR on database error', async () => {
      comboRepository.find.mockRejectedValue(new Error('Database error'));

      await expect(service.getAllCombos()).rejects.toThrow(
        new HttpException(
          { code: 'GET_COMBOS_ERROR', status: HttpStatus.INTERNAL_SERVER_ERROR },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('createOfertaFloor', () => {
    const mockOfertaDto = {
      nombre: 'Oferta Test',
      descuento: 20,
      fechaInicio: new Date(),
      fechaFin: new Date(),
      plantasIds: [1, 2],
    };

    const mockPlantas: Floor[] = [
      { id: 1, nombre: 'Planta 1' } as Floor,
      { id: 2, nombre: 'Planta 2' } as Floor,
    ];

    it('should create oferta successfully', async () => {
      floorRepository.findBy.mockResolvedValue(mockPlantas);

      const mockCreatedOferta = {
        id: 1,
        ...mockOfertaDto,
        plantas: mockPlantas,
      };

      ofertaRepository.create.mockReturnValue(mockCreatedOferta as Oferta);
      ofertaRepository.save.mockResolvedValue(mockCreatedOferta as Oferta);

      const result = await service.createOfertaFloor(mockOfertaDto);

      expect(floorRepository.findBy).toHaveBeenCalledWith({
        id: expect.any(Object),
      });
      expect(ofertaRepository.create).toHaveBeenCalledWith({
        nombre: mockOfertaDto.nombre,
        descuento: mockOfertaDto.descuento,
        fechaInicio: mockOfertaDto.fechaInicio,
        fechaFin: mockOfertaDto.fechaFin,
        plantas: mockPlantas,
      });
      expect(result).toEqual({ data: mockCreatedOferta });
    });

    it('should throw FLOOR_NOT_FOUND when some plantas do not exist', async () => {
      floorRepository.findBy.mockResolvedValue([mockPlantas[0]]);

      await expect(service.createOfertaFloor(mockOfertaDto)).rejects.toThrow(
        new HttpException(
          { code: 'FLOOR_NOT_FOUND', status: HttpStatus.NOT_FOUND },
          HttpStatus.NOT_FOUND,
        ),
      );
    });

    it('should throw CREATE_OFERTA_ERROR on database error', async () => {
      floorRepository.findBy.mockResolvedValue(mockPlantas);
      ofertaRepository.create.mockReturnValue({} as Oferta);
      ofertaRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.createOfertaFloor(mockOfertaDto)).rejects.toThrow(
        new HttpException(
          { code: 'CREATE_OFERTA_ERROR', message: 'Error al crear la oferta' },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('createCombo', () => {
    const mockComboDto = {
      nombre: 'Combo Test',
      descripcion: 'Descripción del combo',
      precio: 150,
      activo: true,
      items: [
        { plantaId: 1, cantidad: 2 },
        { plantaId: 2, cantidad: 1 },
      ],
    };

    const mockPlantas: Floor[] = [
      { id: 1, nombre: 'Planta 1' } as Floor,
      { id: 2, nombre: 'Planta 2' } as Floor,
    ];

    it('should create combo successfully', async () => {
      floorRepository.findBy.mockResolvedValue(mockPlantas);

      const mockCreatedCombo = {
        id: 1,
        nombre: mockComboDto.nombre,
        descripcion: mockComboDto.descripcion,
        precio: mockComboDto.precio,
        activo: mockComboDto.activo,
        items: mockComboDto.items.map((item) => ({
          planta: { id: item.plantaId },
          cantidad: item.cantidad,
        })),
      };

      comboRepository.create.mockReturnValue(mockCreatedCombo as Combo);
      comboRepository.save.mockResolvedValue(mockCreatedCombo as Combo);

      const result = await service.createCombo(mockComboDto);

      expect(floorRepository.findBy).toHaveBeenCalledWith({
        id: expect.any(Object),
      });
      expect(comboRepository.create).toHaveBeenCalled();
      expect(comboRepository.save).toHaveBeenCalled();
      expect(result).toEqual({ data: mockCreatedCombo });
    });

    it('should throw NO_PLANTS_FOUND when some plantas do not exist', async () => {
      floorRepository.findBy.mockResolvedValue([mockPlantas[0]]);

      await expect(service.createCombo(mockComboDto)).rejects.toThrow(
        new HttpException(
          { code: 'NO_PLANTS_FOUND', status: HttpStatus.NOT_FOUND },
          HttpStatus.NOT_FOUND,
        ),
      );
    });

    it('should throw CREATE_COMBO_ERROR on database error', async () => {
      floorRepository.findBy.mockResolvedValue(mockPlantas);
      comboRepository.create.mockReturnValue({} as Combo);
      comboRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.createCombo(mockComboDto)).rejects.toThrow(
        new HttpException(
          { code: 'CREATE_COMBO_ERROR', message: 'Error al crear el combo' },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });
});
