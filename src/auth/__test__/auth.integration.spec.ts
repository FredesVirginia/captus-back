import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { User } from 'src/users/entity/user.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthDto } from '../dtos/auth.dto';
import { LoginAuthDto } from '../dtos/login.auth.dto';
import { UserEnum } from 'src/users/enums/user.enum';
import { HttpException, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

/**
 * Tests de Integración para AuthService
 *
 * Estos tests verifican que los componentes del módulo Auth funcionen correctamente juntos:
 * - AuthService interactúa con el Repository (simulado en memoria)
 * - AuthService interactúa con JwtService (real)
 * - Bcrypt para hasheo de contraseñas (real)
 *
 * A diferencia de los unit tests que mockean todas las dependencias,
 * estos tests usan dependencias reales donde es posible.
 */
describe('AuthService Integration Tests', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let userRepository: Repository<User>;

  // Simulación de base de datos en memoria
  let users: User[];
  let userIdCounter: number;

  beforeEach(async () => {
    // Reiniciar el almacenamiento en memoria
    users = [];
    userIdCounter = 1;

    // Crear un mock del Repository que simula una base de datos en memoria
    const mockRepository = {
      create: jest.fn((userData: Partial<User>) => {
        const user = new User();
        Object.assign(user, userData);
        return user;
      }),

      save: jest.fn(async (user: User) => {
        if (!user.id) {
          user.id = userIdCounter++;
        }
        const existingIndex = users.findIndex(u => u.id === user.id);
        if (existingIndex >= 0) {
          users[existingIndex] = user;
        } else {
          users.push(user);
        }
        return user;
      }),

      findOne: jest.fn(async ({ where }: any) => {
        if (where.email) {
          return users.find(u => u.email === where.email) || null;
        }
        if (where.id) {
          return users.find(u => u.id === where.id) || null;
        }
        return null;
      }),

      findOneBy: jest.fn(async (criteria: any) => {
        if (criteria.email) {
          return users.find(u => u.email === criteria.email) || null;
        }
        if (criteria.id) {
          return users.find(u => u.id === criteria.id) || null;
        }
        return null;
      }),

      find: jest.fn(async () => users),

      delete: jest.fn(async (criteria: any) => {
        const initialLength = users.length;
        users = users.filter(u => u.id !== criteria.id);
        return { affected: initialLength - users.length };
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'super-secret-jwt',
          signOptions: { expiresIn: '1d' },
        }),
      ],
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('debe registrar un nuevo usuario exitosamente', async () => {
      const dto: AuthDto = {
        nombre: 'Test User',
        phone: '123456789',
        email: 'test@example.com',
        role: UserEnum.USER,
        password: 'password123',
      };

      const result = await service.register(dto);

      // Verificar que retorna un token JWT válido
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');

      // Verificar que el token puede ser decodificado
      const decoded = jwtService.decode(result);
      expect(decoded).toHaveProperty('email', dto.email);
      expect(decoded).toHaveProperty('role', UserEnum.USER);

      // Verificar que el usuario se guardó
      expect(users).toHaveLength(1);
      expect(users[0].nombre).toBe(dto.nombre);
      expect(users[0].email).toBe(dto.email);
      expect(users[0].phone).toBe(dto.phone);
      expect(users[0].role).toBe(UserEnum.USER);

      // Verificar que la contraseña está hasheada
      expect(users[0].password).not.toBe(dto.password);
      const isPasswordHashed = await bcrypt.compare(dto.password, users[0].password);
      expect(isPasswordHashed).toBe(true);
    });

    it('debe lanzar error si el email ya existe', async () => {
      const dto: AuthDto = {
        nombre: 'Test User',
        phone: '123456789',
        email: 'duplicate@example.com',
        role: UserEnum.USER,
        password: 'password123',
      };

      // Registrar usuario por primera vez
      await service.register(dto);
      expect(users).toHaveLength(1);

      // Intentar registrar el mismo email nuevamente
      await expect(service.register(dto)).rejects.toThrow(HttpException);
      await expect(service.register(dto)).rejects.toMatchObject({
        response: { code: 'USER_EXISTS', status: HttpStatus.CONFLICT },
      });

      // Verificar que no se creó un segundo usuario
      expect(users).toHaveLength(1);
    });

    it('debe crear un usuario ADMIN correctamente', async () => {
      const dto: AuthDto = {
        nombre: 'Admin User',
        phone: '987654321',
        email: 'admin@example.com',
        role: UserEnum.ADMIN,
        password: 'adminpass123',
      };

      await service.register(dto);

      expect(users).toHaveLength(1);
      expect(users[0].role).toBe(UserEnum.ADMIN);
    });

    it('debe llamar a los métodos correctos del repository', async () => {
      const dto: AuthDto = {
        nombre: 'Test User',
        phone: '123456789',
        email: 'test@example.com',
        role: UserEnum.USER,
        password: 'password123',
      };

      await service.register(dto);

      // Verificar que se llamó a findOne para verificar si existe
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: dto.email },
      });

      // Verificar que se llamó a create y save
      expect(userRepository.create).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const registerDto: AuthDto = {
      nombre: 'Login Test User',
      phone: '555555555',
      email: 'login@example.com',
      role: UserEnum.USER,
      password: 'password123',
    };

    beforeEach(async () => {
      // Registrar usuario antes de cada test de login
      await service.register(registerDto);
    });

    it('debe hacer login exitosamente con credenciales correctas', async () => {
      const loginDto: LoginAuthDto = {
        email: registerDto.email,
        password: registerDto.password,
      };

      const result = await service.login(loginDto);

      expect(result).toBeDefined();
      expect(result.access_token).toBeDefined();
      expect(typeof result.access_token).toBe('string');
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(registerDto.email);
      expect(result.user.name).toBe(registerDto.nombre);
      expect(result.user.role).toBe(UserEnum.USER);
      expect(result.user.id).toBeDefined();

      // Verificar que el token es válido
      const decoded: any = jwtService.decode(result.access_token);
      expect(decoded.email).toBe(registerDto.email);
    });

    it('debe lanzar error si el usuario no existe', async () => {
      const loginDto: LoginAuthDto = {
        email: 'noexiste@example.com',
        password: 'password123',
      };

      await expect(service.login(loginDto)).rejects.toThrow(HttpException);
      await expect(service.login(loginDto)).rejects.toMatchObject({
        response: { code: 'USER_NOT_FOUND', status: HttpStatus.NOT_FOUND },
      });
    });

    it('debe lanzar error si la contraseña es incorrecta', async () => {
      const loginDto: LoginAuthDto = {
        email: registerDto.email,
        password: 'wrongpassword',
      };

      await expect(service.login(loginDto)).rejects.toThrow(HttpException);
      await expect(service.login(loginDto)).rejects.toMatchObject({
        response: {
          code: 'UNAUTHORIZED_USER',
          status: HttpStatus.UNAUTHORIZED,
        },
      });
    });

  });

  describe('validateToken', () => {
    it('debe validar un token válido correctamente', async () => {
      const dto: AuthDto = {
        nombre: 'Token Test User',
        phone: '999999999',
        email: 'token@example.com',
        role: UserEnum.USER,
        password: 'password123',
      };

      const token = await service.register(dto);
      const validation = await service.validateToken(token);

      expect(validation.valid).toBe(true);
      expect(validation.user).toBeDefined();
      expect(validation.user.email).toBe(dto.email);
      expect(validation.user.role).toBe(UserEnum.USER);
    });

    it('debe rechazar un token inválido', async () => {
      const invalidToken = 'invalid.token.here';
      const validation = await service.validateToken(invalidToken);

      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
    });

    it('debe rechazar un token mal formado', async () => {
      const malformedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.malformed';
      const validation = await service.validateToken(malformedToken);

      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
    });

    it('debe usar el JwtService real para validación', async () => {
      const dto: AuthDto = {
        nombre: 'Token Test User',
        phone: '999999999',
        email: 'token@example.com',
        role: UserEnum.USER,
        password: 'password123',
      };

      const token = await service.register(dto);
      const jwtVerifySpy = jest.spyOn(jwtService, 'verify');

      await service.validateToken(token);

      expect(jwtVerifySpy).toHaveBeenCalledWith(token, { secret: 'super-secret-jwt' });
      jwtVerifySpy.mockRestore();
    });
  });

  describe('Flujo completo: register -> login -> validateToken', () => {
    it('debe completar el flujo de autenticación completo', async () => {
      // 1. Registrar nuevo usuario
      const registerDto: AuthDto = {
        nombre: 'Full Flow User',
        phone: '111222333',
        email: 'fullflow@example.com',
        role: UserEnum.USER,
        password: 'securepass123',
      };

      const registerToken = await service.register(registerDto);
      expect(registerToken).toBeDefined();
      expect(users).toHaveLength(1);

      // 2. Hacer login con el usuario registrado
      const loginDto: LoginAuthDto = {
        email: registerDto.email,
        password: registerDto.password,
      };

      const loginResult = await service.login(loginDto);
      expect(loginResult.access_token).toBeDefined();
      expect(loginResult.user.email).toBe(registerDto.email);

      // 3. Validar el token de login
      const validation = await service.validateToken(loginResult.access_token);
      expect(validation.valid).toBe(true);
      expect(validation.user.email).toBe(registerDto.email);

      // 4. Verificar que el usuario está en la "base de datos"
      expect(users).toHaveLength(1);
      expect(users[0].nombre).toBe(registerDto.nombre);
      expect(users[0].role).toBe(UserEnum.USER);
    });
  });

  describe('Múltiples usuarios', () => {
    it('debe manejar múltiples usuarios simultáneamente', async () => {
      const userDtos = [
        {
          nombre: 'User 1',
          phone: '111111111',
          email: 'user1@example.com',
          role: UserEnum.USER,
          password: 'pass1pass1',
        },
        {
          nombre: 'User 2',
          phone: '222222222',
          email: 'user2@example.com',
          role: UserEnum.ADMIN,
          password: 'pass2pass2',
        },
        {
          nombre: 'User 3',
          phone: '333333333',
          email: 'user3@example.com',
          role: UserEnum.USER,
          password: 'pass3pass3',
        },
      ];

      // Registrar todos los usuarios
      for (const userDto of userDtos) {
        await service.register(userDto as AuthDto);
      }

      // Verificar que todos estén en la base de datos
      expect(users).toHaveLength(3);

      // Verificar login de cada usuario
      for (let i = 0; i < userDtos.length; i++) {
        const loginResult = await service.login({
          email: userDtos[i].email,
          password: userDtos[i].password,
        });
        expect(loginResult.user.email).toBe(userDtos[i].email);
        expect(loginResult.user.role).toBe(userDtos[i].role);
      }
    });

    it('debe mantener contraseñas hasheadas independientes para cada usuario', async () => {
      const user1: AuthDto = {
        nombre: 'User 1',
        phone: '111111111',
        email: 'user1@test.com',
        role: UserEnum.USER,
        password: 'samepassword',
      };

      const user2: AuthDto = {
        nombre: 'User 2',
        phone: '222222222',
        email: 'user2@test.com',
        role: UserEnum.USER,
        password: 'samepassword',
      };

      await service.register(user1);
      await service.register(user2);

      // Aunque las contraseñas son iguales, los hashes deben ser diferentes (bcrypt usa salt)
      expect(users[0].password).not.toBe(users[1].password);

      // Pero ambas deben validar correctamente
      const isValid1 = await bcrypt.compare('samepassword', users[0].password);
      const isValid2 = await bcrypt.compare('samepassword', users[1].password);
      expect(isValid1).toBe(true);
      expect(isValid2).toBe(true);
    });
  });

  describe('Integración con servicios reales', () => {
    it('debe usar JwtService real para firmar tokens', async () => {
      const jwtSignSpy = jest.spyOn(jwtService, 'signAsync');

      const dto: AuthDto = {
        nombre: 'JWT Test',
        phone: '123456789',
        email: 'jwt@test.com',
        role: UserEnum.USER,
        password: 'testpass123',
      };

      await service.register(dto);

      expect(jwtSignSpy).toHaveBeenCalled();
      const callArgs = jwtSignSpy.mock.calls[0][0];
      expect(callArgs).toHaveProperty('email', dto.email);
      expect(callArgs).toHaveProperty('role', UserEnum.USER);

      jwtSignSpy.mockRestore();
    });
  });
});
