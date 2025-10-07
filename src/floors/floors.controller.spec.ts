import { Test, TestingModule } from '@nestjs/testing';
import { FloorsController } from './floors.controller';
import { FloorsService } from './floors.service';
import { CreateFloorDto } from './dtos/CreateFloorDto';
import { CreateOfertaDto } from './dtos/OfertaDto';
import { CreateComboDto } from './dtos/ComboDto';
import { FloorEnum } from './enums/FloorEnum';

describe('FloorsController', () => {
  let controller: FloorsController;
  let service: FloorsService;

  const mockFloorsService = {
    uploadImage: jest.fn(),
    createOfertaFloor: jest.fn(),
    createCombo: jest.fn(),
    getAllFloors: jest.fn(),
    getAllOfertas: jest.fn(),
    getAllCombos: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FloorsController],
      providers: [
        {
          provide: FloorsService,
          useValue: mockFloorsService,
        },
      ],
    }).compile();

    controller = module.get<FloorsController>(FloorsController);
    service = module.get<FloorsService>(FloorsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadImage', () => {
    it('should upload image and create floor successfully', async () => {
      const mockFile = {
        buffer: Buffer.from('fake-image'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const dto: CreateFloorDto = {
        nombre: 'Planta Test',
        descripcion: 'Descripci�n test',
        categoria: FloorEnum.CAPTU,
        precio: 100,
        stock: 10,
      };

      const expectedResult = {
        data: {
          id: 1,
          nombre: 'Planta Test',
          descripcion: 'Descripci�n test',
          categoria: FloorEnum.CAPTU,
          precio: 100,
          stock: 10,
          imagenUrl: 'https://blob.url/image.jpg',
        },
      };

      mockFloorsService.uploadImage.mockResolvedValue(expectedResult);

      const result = await controller.uploadImage(mockFile, dto);

      expect(service.uploadImage).toHaveBeenCalledWith(mockFile, dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('createOferta', () => {
    it('should create oferta successfully', async () => {
      const dto: CreateOfertaDto = {
        nombre: 'Oferta Test',
        descuento: 20,
        fechaInicio: new Date('2025-01-01'),
        fechaFin: new Date('2025-12-31'),
        plantasIds: [1, 2, 3],
      };

      const expectedResult = {
        data: {
          id: 1,
          nombre: 'Oferta Test',
          descuento: 20,
          plantas: [],
        },
      };

      mockFloorsService.createOfertaFloor.mockResolvedValue(expectedResult);

      const result = await controller.createOferta(dto);

      expect(service.createOfertaFloor).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('createCombo', () => {
    it('should create combo successfully', async () => {
      const dto: CreateComboDto = {
        nombre: 'Combo Test',
        descripcion: 'Descripci�n combo',
        precio: 200,
        activo: true,
        items: [
          { plantaId: 1, cantidad: 2 },
          { plantaId: 2, cantidad: 1 },
        ],
      };

      const expectedResult = {
        data: {
          id: 1,
          nombre: 'Combo Test',
          descripcion: 'Descripci�n combo',
          precio: 200,
          activo: true,
          items: [],
        },
      };

      mockFloorsService.createCombo.mockResolvedValue(expectedResult);

      const result = await controller.createCombo(dto);

      expect(service.createCombo).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getFloors', () => {
    it('should return paginated floors with default page 1', async () => {
      const expectedResult = {
        data: [
          {
            id: 1,
            nombre: 'Planta 1',
            descripcion: 'Desc 1',
            categoria: FloorEnum.CAPTU,
            precio: 100,
            stock: 10,
            imagenUrl: 'url1.jpg',
          },
        ],
        meta: {
          page: 1,
          pageSize: 5,
          total: 1,
          totalPages: 1,
        },
      };

      mockFloorsService.getAllFloors.mockResolvedValue(expectedResult);

      const result = await controller.getFloors();

      expect(service.getAllFloors).toHaveBeenCalledWith(1, 5);
      expect(result).toEqual(expectedResult);
    });

    it('should return paginated floors with specified page', async () => {
      const expectedResult = {
        data: [],
        meta: {
          page: 2,
          pageSize: 5,
          total: 5,
          totalPages: 1,
        },
      };

      mockFloorsService.getAllFloors.mockResolvedValue(expectedResult);

      const result = await controller.getFloors('2');

      expect(service.getAllFloors).toHaveBeenCalledWith(2, 5);
      expect(result).toEqual(expectedResult);
    });

    it('should handle invalid page string by defaulting to 1', async () => {
      const expectedResult = {
        data: [],
        meta: {
          page: 1,
          pageSize: 5,
          total: 0,
          totalPages: 0,
        },
      };

      mockFloorsService.getAllFloors.mockResolvedValue(expectedResult);

      const result = await controller.getFloors('invalid');

      expect(service.getAllFloors).toHaveBeenCalledWith(NaN, 5);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getOfertas', () => {
    it('should return all ofertas', async () => {
      const expectedResult = {
        data: [
          {
            id: 1,
            nombre: 'Oferta 1',
            descuento: 20,
          },
        ],
        ofertas: [
          {
            nombre: 'Oferta 1',
            plantas: [
              {
                nombre: 'Planta 1',
                precioOriginal: 100,
                precioConDescuento: 80,
              },
            ],
          },
        ],
      };

      mockFloorsService.getAllOfertas.mockResolvedValue(expectedResult);

      const result = await controller.getOfertas();

      expect(service.getAllOfertas).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });

    it('should return empty arrays when no ofertas exist', async () => {
      const expectedResult = {
        data: [],
        ofertas: [],
      };

      mockFloorsService.getAllOfertas.mockResolvedValue(expectedResult);

      const result = await controller.getOfertas();

      expect(service.getAllOfertas).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getCombos', () => {
    it('should return all combos', async () => {
      const expectedResult = {
        data: [
          {
            id: 1,
            nombre: 'Combo 1',
            descripcion: 'Descripci�n',
            precio: 200,
            activo: true,
            items: [
              {
                cantidad: 2,
                planta: {
                  id: 1,
                  nombre: 'Planta 1',
                  precio: 100,
                },
              },
            ],
          },
        ],
      };

      mockFloorsService.getAllCombos.mockResolvedValue(expectedResult);

      const result = await controller.getCombos();

      expect(service.getAllCombos).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });

    it('should return empty array when no combos exist', async () => {
      const expectedResult = {
        data: [],
      };

      mockFloorsService.getAllCombos.mockResolvedValue(expectedResult);

      const result = await controller.getCombos();

      expect(service.getAllCombos).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });
});
