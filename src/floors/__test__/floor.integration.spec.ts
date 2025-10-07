import { Test, TestingModule } from '@nestjs/testing';
import { FloorsService } from '../floors.service';
import { Floor } from '../entity/floor.entity';
import { Oferta } from '../entity/oferta.entity';
import { Combo } from '../entity/combo.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateFloorDto } from '../dtos/CreateFloorDto';
import { CreateOfertaDto } from '../dtos/OfertaDto';
import { CreateComboDto } from '../dtos/ComboDto';
import { FloorEnum } from '../enums/FloorEnum';
import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Tests de Integraci�n para FloorsService
 *
 * Estos tests verifican que los componentes del m�dulo Floors funcionen correctamente juntos:
 * - FloorsService interact�a con los Repositories (simulados en memoria)
 * - C�lculos de precios con descuentos
 * - Relaciones entre Floor, Oferta y Combo
 *
 * A diferencia de los unit tests que mockean todas las dependencias,
 * estos tests usan repositorios simulados en memoria.
 */
describe('FloorsService Integration Tests', () => {
  let service: FloorsService;
  let floorRepository: Repository<Floor>;
  let ofertaRepository: Repository<Oferta>;
  let comboRepository: Repository<Combo>;

  // Simulaci�n de base de datos en memoria
  let floors: Floor[];
  let ofertas: Oferta[];
  let combos: Combo[];
  let floorIdCounter: number;
  let ofertaIdCounter: number;
  let comboIdCounter: number;

  beforeEach(async () => {
    // Reiniciar el almacenamiento en memoria
    floors = [];
    ofertas = [];
    combos = [];
    floorIdCounter = 1;
    ofertaIdCounter = 1;
    comboIdCounter = 1;

    // Mock del Floor Repository
    const mockFloorRepository = {
      save: jest.fn(async (floor: Partial<Floor>) => {
        const newFloor = new Floor();
        Object.assign(newFloor, floor);

        if (!newFloor.id) {
          newFloor.id = floorIdCounter++;
        }

        const existingIndex = floors.findIndex(f => f.id === newFloor.id);
        if (existingIndex >= 0) {
          floors[existingIndex] = newFloor;
        } else {
          floors.push(newFloor);
        }

        return newFloor;
      }),

      findAndCount: jest.fn(async ({ relations, skip, take }: any) => {
        let result = [...floors];

        // Simular relaciones
        if (relations && relations.includes('oferta')) {
          result = result.map(floor => {
            const oferta = ofertas.find(o => o.plantas?.some(p => p.id === floor.id));
            return { ...floor, oferta: oferta || undefined };
          });
        }

        const total = result.length;
        const paginatedResult = result.slice(skip, skip + take);

        return [paginatedResult, total];
      }),

      findBy: jest.fn(async (criteria: any) => {
        // Handle In() operator from TypeORM
        if (criteria.id && criteria.id._type === 'in') {
          const ids = criteria.id._value;
          return floors.filter(f => ids.includes(f.id));
        }
        // Handle simple array
        if (Array.isArray(criteria.id)) {
          return floors.filter(f => criteria.id.includes(f.id));
        }
        // Handle single value
        return floors.filter(f => f.id === criteria.id);
      }),

      find: jest.fn(async () => floors),
    };

    // Mock del Oferta Repository
    const mockOfertaRepository = {
      create: jest.fn((oferta: Partial<Oferta>) => {
        const newOferta = new Oferta();
        Object.assign(newOferta, oferta);
        return newOferta;
      }),

      save: jest.fn(async (oferta: Oferta) => {
        if (!oferta.id) {
          oferta.id = ofertaIdCounter++;
        }

        const existingIndex = ofertas.findIndex(o => o.id === oferta.id);
        if (existingIndex >= 0) {
          ofertas[existingIndex] = oferta;
        } else {
          ofertas.push(oferta);
        }

        return oferta;
      }),

      find: jest.fn(async ({ relations }: any) => {
        let result = [...ofertas];

        if (relations && relations.includes('plantas')) {
          result = result.map(oferta => ({
            ...oferta,
            plantas: oferta.plantas || [],
          }));
        }

        return result;
      }),
    };

    // Mock del Combo Repository
    const mockComboRepository = {
      create: jest.fn((combo: Partial<Combo>) => {
        const newCombo = new Combo();
        Object.assign(newCombo, combo);
        return newCombo;
      }),

      save: jest.fn(async (combo: Combo) => {
        if (!combo.id) {
          combo.id = comboIdCounter++;
        }

        const existingIndex = combos.findIndex(c => c.id === combo.id);
        if (existingIndex >= 0) {
          combos[existingIndex] = combo;
        } else {
          combos.push(combo);
        }

        return combo;
      }),

      find: jest.fn(async ({ relations }: any) => {
        return combos;
      }),
    };

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
    floorRepository = module.get<Repository<Floor>>(getRepositoryToken(Floor));
    ofertaRepository = module.get<Repository<Oferta>>(getRepositoryToken(Oferta));
    comboRepository = module.get<Repository<Combo>>(getRepositoryToken(Combo));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllFloors', () => {
    beforeEach(() => {
      // Crear floors de prueba
      const floor1 = new Floor();
      floor1.id = 1;
      floor1.nombre = 'Suculenta 1';
      floor1.descripcion = 'Descripci�n 1';
      floor1.categoria = FloorEnum.SUCULENTA;
      floor1.precio = 100;
      floor1.stock = 10;
      floor1.imagenUrl = 'http://example.com/img1.jpg';
      floors.push(floor1);

      const floor2 = new Floor();
      floor2.id = 2;
      floor2.nombre = 'Captu 1';
      floor2.descripcion = 'Descripci�n 2';
      floor2.categoria = FloorEnum.CAPTU;
      floor2.precio = 200;
      floor2.stock = 5;
      floor2.imagenUrl = 'http://example.com/img2.jpg';
      floors.push(floor2);
    });

    it('debe retornar todos los floors con paginaci�n', async () => {
      const result = await service.getAllFloors(1, 5);

      expect(Array.isArray(result)).toBe(false);
      if (!Array.isArray(result)) {
        expect(result.data).toHaveLength(2);
        expect(result.page).toBe(1);
        expect(result.pageSize).toBe(5);
        expect(result.total).toBe(2);
        expect(result.totalPages).toBe(1);
        expect(result.hasNext).toBe(false);
        expect(result.hasPrev).toBe(false);
      }
    });

    it('debe retornar array vac�o cuando no hay floors', async () => {
      floors = [];

      const result = await service.getAllFloors(1, 5);

      expect(result).toEqual([]);
    });

    it('debe calcular el precio final cuando hay oferta', async () => {
      // Crear oferta con 20% descuento
      const oferta = new Oferta();
      oferta.id = 1;
      oferta.nombre = 'Oferta de Primavera';
      oferta.descuento = 20;
      oferta.fechaInicio = new Date();
      oferta.fechaFin = new Date();
      oferta.plantas = [floors[0]];
      ofertas.push(oferta);

      const result = await service.getAllFloors(1, 5);

      expect(Array.isArray(result)).toBe(false);
      if (!Array.isArray(result)) {
        expect(result.data).toHaveLength(2);

        // Floor con oferta debe tener precioFinal
        const floorConOferta: any = result.data.find((f: any) => f.id === 1);
        expect(floorConOferta).toBeDefined();
        expect(floorConOferta).toHaveProperty('precioFinal');
        expect(floorConOferta.precioFinal).toBe('80.00'); // 100 - 20%

        // Floor sin oferta no debe tener precioFinal
        const floorSinOferta: any = result.data.find((f: any) => f.id === 2);
        expect(floorSinOferta).toBeDefined();
        expect(floorSinOferta).not.toHaveProperty('precioFinal');
      }
    });

    it('debe manejar paginaci�n correctamente', async () => {
      // Agregar m�s floors
      for (let i = 3; i <= 10; i++) {
        const floor = new Floor();
        floor.id = i;
        floor.nombre = `Floor ${i}`;
        floor.descripcion = `Descripci�n ${i}`;
        floor.categoria = FloorEnum.CAPTU;
        floor.precio = 100 * i;
        floor.stock = i;
        floor.imagenUrl = `http://example.com/img${i}.jpg`;
        floors.push(floor);
      }

      // P�gina 1
      const page1 = await service.getAllFloors(1, 5);
      expect(Array.isArray(page1)).toBe(false);
      if (!Array.isArray(page1)) {
        expect(page1.data).toHaveLength(5);
        expect(page1.page).toBe(1);
        expect(page1.hasNext).toBe(true);
        expect(page1.hasPrev).toBe(false);
      }

      // P�gina 2
      const page2 = await service.getAllFloors(2, 5);
      expect(Array.isArray(page2)).toBe(false);
      if (!Array.isArray(page2)) {
        expect(page2.data).toHaveLength(5);
        expect(page2.page).toBe(2);
        expect(page2.hasNext).toBe(false);
        expect(page2.hasPrev).toBe(true);
      }
    });

    it('debe lanzar error si el descuento es inv�lido', async () => {
      const oferta = new Oferta();
      oferta.id = 1;
      oferta.nombre = 'Oferta inv�lida';
      oferta.descuento = NaN; // Descuento inv�lido
      oferta.fechaInicio = new Date();
      oferta.fechaFin = new Date();
      oferta.plantas = [floors[0]];
      ofertas.push(oferta);

      await expect(service.getAllFloors(1, 5)).rejects.toThrow(HttpException);
      await expect(service.getAllFloors(1, 5)).rejects.toMatchObject({
        response: { code: 'INVALID_DISCOUNT_VALUE', status: HttpStatus.BAD_REQUEST },
      });
    });
  });

  describe('createOfertaFloor', () => {
    beforeEach(() => {
      // Crear floors de prueba
      const floor1 = new Floor();
      floor1.id = 1;
      floor1.nombre = 'Suculenta 1';
      floor1.precio = 100;
      floors.push(floor1);

      const floor2 = new Floor();
      floor2.id = 2;
      floor2.nombre = 'Suculenta 2';
      floor2.precio = 150;
      floors.push(floor2);
    });

    it('debe crear una oferta exitosamente', async () => {
      const ofertaDto: CreateOfertaDto = {
        nombre: 'Oferta de Verano',
        descuento: 25,
        fechaInicio: new Date('2024-01-01'),
        fechaFin: new Date('2024-12-31'),
        plantasIds: [1, 2],
      };

      const result = await service.createOfertaFloor(ofertaDto);

      expect(result.data).toBeDefined();
      expect(result.data.nombre).toBe('Oferta de Verano');
      expect(result.data.descuento).toBe(25);
      expect(result.data.plantas).toHaveLength(2);
      expect(ofertas).toHaveLength(1);
    });

    it('debe lanzar error si alguna planta no existe', async () => {
      const ofertaDto: CreateOfertaDto = {
        nombre: 'Oferta Inv�lida',
        descuento: 10,
        fechaInicio: new Date(),
        fechaFin: new Date(),
        plantasIds: [1, 999], // 999 no existe
      };

      await expect(service.createOfertaFloor(ofertaDto)).rejects.toThrow(HttpException);
      await expect(service.createOfertaFloor(ofertaDto)).rejects.toMatchObject({
        response: { code: 'FLOOR_NOT_FOUND', status: HttpStatus.NOT_FOUND },
      });
    });

    it('debe llamar a los m�todos correctos del repository', async () => {
      const ofertaDto: CreateOfertaDto = {
        nombre: 'Test Oferta',
        descuento: 15,
        fechaInicio: new Date(),
        fechaFin: new Date(),
        plantasIds: [1],
      };

      await service.createOfertaFloor(ofertaDto);

      expect(floorRepository.findBy).toHaveBeenCalled();
      expect(ofertaRepository.create).toHaveBeenCalled();
      expect(ofertaRepository.save).toHaveBeenCalled();
    });
  });

  describe('getAllOfertas', () => {
    beforeEach(() => {
      // Crear floor
      const floor1 = new Floor();
      floor1.id = 1;
      floor1.nombre = 'Suculenta Premium';
      floor1.precio = 200;
      floors.push(floor1);

      // Crear oferta
      const oferta = new Oferta();
      oferta.id = 1;
      oferta.nombre = 'Super Oferta';
      oferta.descuento = 30;
      oferta.fechaInicio = new Date();
      oferta.fechaFin = new Date();
      oferta.plantas = [floor1];
      ofertas.push(oferta);
    });

    it('debe retornar ofertas con precios calculados', async () => {
      const result = await service.getAllOfertas();

      expect(result.data).toHaveLength(1);
      expect(result.ofertas).toHaveLength(1);

      const oferta = result.ofertas[0];
      expect(oferta.precioFinal).toBe('140.00'); // 200 - 30%
      expect(oferta.nombre).toBe('Suculenta Premium');
    });

    it('debe retornar array vac�o cuando no hay ofertas', async () => {
      ofertas = [];

      const result = await service.getAllOfertas();

      expect(result.data).toEqual([]);
      expect(result.ofertas).toEqual([]);
    });

    it('debe lanzar error si la oferta no tiene descuento v�lido', async () => {
      ofertas[0].descuento = NaN;

      await expect(service.getAllOfertas()).rejects.toThrow(HttpException);
      await expect(service.getAllOfertas()).rejects.toMatchObject({
        response: { code: 'INVALID_DISCOUNT_VALUE', status: HttpStatus.BAD_REQUEST },
      });
    });

    it('debe lanzar error si la oferta no tiene plantas', async () => {
      ofertas[0].plantas = [];

      await expect(service.getAllOfertas()).rejects.toThrow(HttpException);
      await expect(service.getAllOfertas()).rejects.toMatchObject({
        response: { code: 'NO_PLANTS_FOUND', status: HttpStatus.NOT_FOUND },
      });
    });
  });

  describe('createCombo', () => {
    beforeEach(() => {
      // Crear floors de prueba
      const floor1 = new Floor();
      floor1.id = 1;
      floor1.nombre = 'Suculenta 1';
      floor1.precio = 100;
      floors.push(floor1);

      const floor2 = new Floor();
      floor2.id = 2;
      floor2.nombre = 'Captu 1';
      floor2.precio = 150;
      floors.push(floor2);
    });

    it('debe crear un combo exitosamente', async () => {
      const comboDto: CreateComboDto = {
        nombre: 'Combo Primavera',
        descripcion: 'Combo especial de primavera',
        precio: 200,
        activo: true,
        items: [
          { plantaId: 1, cantidad: 2 },
          { plantaId: 2, cantidad: 1 },
        ],
      };

      const result = await service.createCombo(comboDto);

      expect(result.data).toBeDefined();
      expect(result.data.nombre).toBe('Combo Primavera');
      expect(result.data.precio).toBe(200);
      expect(result.data.items).toHaveLength(2);
      expect(combos).toHaveLength(1);
    });

    it('debe lanzar error si alguna planta del combo no existe', async () => {
      const comboDto: CreateComboDto = {
        nombre: 'Combo Inv�lido',
        descripcion: 'Test',
        precio: 100,
        activo: true,
        items: [
          { plantaId: 1, cantidad: 1 },
          { plantaId: 999, cantidad: 1 }, // No existe
        ],
      };

      await expect(service.createCombo(comboDto)).rejects.toThrow(HttpException);
      await expect(service.createCombo(comboDto)).rejects.toMatchObject({
        response: { code: 'NO_PLANTS_FOUND', status: HttpStatus.NOT_FOUND },
      });
    });

    it('debe llamar a los m�todos correctos del repository', async () => {
      const comboDto: CreateComboDto = {
        nombre: 'Test Combo',
        descripcion: 'Test',
        precio: 150,
        activo: true,
        items: [{ plantaId: 1, cantidad: 3 }],
      };

      await service.createCombo(comboDto);

      expect(floorRepository.findBy).toHaveBeenCalled();
      expect(comboRepository.create).toHaveBeenCalled();
      expect(comboRepository.save).toHaveBeenCalled();
    });
  });

  describe('getAllCombos', () => {
    beforeEach(() => {
      const combo1 = new Combo();
      combo1.id = 1;
      combo1.nombre = 'Combo 1';
      combo1.descripcion = 'Test combo';
      combo1.precio = 250;
      combo1.activo = true;
      combos.push(combo1);

      const combo2 = new Combo();
      combo2.id = 2;
      combo2.nombre = 'Combo 2';
      combo2.descripcion = 'Another combo';
      combo2.precio = 300;
      combo2.activo = false;
      combos.push(combo2);
    });

    it('debe retornar todos los combos', async () => {
      const result = await service.getAllCombos();

      expect(result.data).toHaveLength(2);
      expect(result.data[0].nombre).toBe('Combo 1');
      expect(result.data[1].nombre).toBe('Combo 2');
    });

    it('debe retornar array vac�o cuando no hay combos', async () => {
      combos = [];

      const result = await service.getAllCombos();

      expect(result.data).toEqual([]);
    });
  });

  describe('Flujos completos', () => {
    it('debe crear floors, oferta y calcular precios correctamente', async () => {
      // 1. Crear floors
      const floor1 = new Floor();
      floor1.id = 1;
      floor1.nombre = 'Suculenta A';
      floor1.precio = 100;
      floor1.stock = 10;
      floors.push(floor1);

      const floor2 = new Floor();
      floor2.id = 2;
      floor2.nombre = 'Suculenta B';
      floor2.precio = 150;
      floor2.stock = 5;
      floors.push(floor2);

      // 2. Crear oferta
      const ofertaDto: CreateOfertaDto = {
        nombre: 'Black Friday',
        descuento: 50,
        fechaInicio: new Date(),
        fechaFin: new Date(),
        plantasIds: [1, 2],
      };

      const ofertaResult = await service.createOfertaFloor(ofertaDto);
      expect(ofertaResult.data).toBeDefined();

      // 3. Obtener floors con precios calculados
      const floorsResult = await service.getAllFloors(1, 10);

      expect(Array.isArray(floorsResult)).toBe(false);
      if (!Array.isArray(floorsResult)) {
        const floor1WithDiscount: any = floorsResult.data.find((f: any) => f.id === 1);
        const floor2WithDiscount: any = floorsResult.data.find((f: any) => f.id === 2);

        expect(floor1WithDiscount).toBeDefined();
        expect(floor2WithDiscount).toBeDefined();
        expect(floor1WithDiscount.precioFinal).toBe('50.00'); // 100 - 50%
        expect(floor2WithDiscount.precioFinal).toBe('75.00'); // 150 - 50%
      }
    });

    it('debe manejar m�ltiples ofertas y combos simult�neamente', async () => {
      // Crear floors
      for (let i = 1; i <= 5; i++) {
        const floor = new Floor();
        floor.id = i;
        floor.nombre = `Plant ${i}`;
        floor.precio = 100 * i;
        floor.stock = i * 2;
        floors.push(floor);
      }

      // Crear ofertas
      const oferta1 = await service.createOfertaFloor({
        nombre: 'Oferta 1',
        descuento: 10,
        fechaInicio: new Date(),
        fechaFin: new Date(),
        plantasIds: [1, 2],
      });

      const oferta2 = await service.createOfertaFloor({
        nombre: 'Oferta 2',
        descuento: 20,
        fechaInicio: new Date(),
        fechaFin: new Date(),
        plantasIds: [3, 4],
      });

      // Crear combos
      const combo1 = await service.createCombo({
        nombre: 'Combo Verano',
        descripcion: 'Combo de verano',
        precio: 400,
        activo: true,
        items: [
          { plantaId: 1, cantidad: 2 },
          { plantaId: 5, cantidad: 1 },
        ],
      });

      expect(ofertas).toHaveLength(2);
      expect(combos).toHaveLength(1);

      const ofertasResult = await service.getAllOfertas();
      const combosResult = await service.getAllCombos();

      expect(ofertasResult.data).toHaveLength(2);
      expect(combosResult.data).toHaveLength(1);
    });
  });
});