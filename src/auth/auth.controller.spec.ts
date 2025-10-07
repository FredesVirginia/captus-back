import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthDto } from './dtos/auth.dto';
import { LoginAuthDto } from './dtos/login.auth.dto';
import { UserEnum } from 'src/users/enums/user.enum';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    validateToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto: AuthDto = {
        nombre: 'Test User',
        phone: '1234567890',
        email: 'test@example.com',
        password: 'password123',
        role: UserEnum.USER,
      };

      const expectedResult = 'mock-jwt-token';

      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto);

      expect(service.register).toHaveBeenCalledWith(registerDto);
      expect(result).toBe(expectedResult);
    });

    it('should call service with admin role', async () => {
      const registerDto: AuthDto = {
        nombre: 'Admin User',
        phone: '9876543210',
        email: 'admin@example.com',
        password: 'adminpass123',
        role: UserEnum.ADMIN,
      };

      const expectedResult = 'mock-admin-jwt-token';

      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto);

      expect(service.register).toHaveBeenCalledWith(registerDto);
      expect(result).toBe(expectedResult);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginDto: LoginAuthDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const expectedResult = {
        access_token: 'mock-jwt-token',
        user: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          role: UserEnum.USER,
        },
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(service.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(expectedResult);
    });

    it('should return user data with token on successful login', async () => {
      const loginDto: LoginAuthDto = {
        email: 'admin@example.com',
        password: 'adminpass123',
      };

      const expectedResult = {
        access_token: 'mock-admin-jwt-token',
        user: {
          id: 2,
          name: 'Admin User',
          email: 'admin@example.com',
          role: UserEnum.ADMIN,
        },
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(service.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('validate', () => {
    it('should validate token successfully', async () => {
      const payload = { token: 'valid-jwt-token' };

      const expectedResult = {
        valid: true,
        user: {
          sub: 1,
          email: 'test@example.com',
          role: UserEnum.USER,
        },
      };

      mockAuthService.validateToken.mockResolvedValue(expectedResult);

      const result = await controller.validate(payload);

      expect(service.validateToken).toHaveBeenCalledWith(payload.token);
      expect(result).toEqual(expectedResult);
    });

    it('should return invalid for expired token', async () => {
      const payload = { token: 'expired-jwt-token' };

      const expectedResult = {
        valid: false,
        error: 'jwt expired',
      };

      mockAuthService.validateToken.mockResolvedValue(expectedResult);

      const result = await controller.validate(payload);

      expect(service.validateToken).toHaveBeenCalledWith(payload.token);
      expect(result).toEqual(expectedResult);
    });

    it('should return invalid for malformed token', async () => {
      const payload = { token: 'malformed-token' };

      const expectedResult = {
        valid: false,
        error: 'jwt malformed',
      };

      mockAuthService.validateToken.mockResolvedValue(expectedResult);

      const result = await controller.validate(payload);

      expect(service.validateToken).toHaveBeenCalledWith(payload.token);
      expect(result).toEqual(expectedResult);
    });
  });
});