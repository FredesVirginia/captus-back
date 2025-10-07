import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/users/entity/user.entity';
import { Repository } from 'typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthDto } from './dtos/auth.dto';
import { LoginAuthDto } from './dtos/login.auth.dto';
import { UserEnum } from 'src/users/enums/user.enum';

// Mock bcrypt
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUserRepository = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto: AuthDto = {
      nombre: 'Test User',
      phone: '1234567890',
      email: 'test@example.com',
      password: 'password123',
      role: UserEnum.USER,
    };

    it('should register a new user successfully', async () => {
      const hashedPassword = 'hashedPassword123';
      const mockUser = {
        id: 1,
        nombre: registerDto.nombre,
        email: registerDto.email,
        phone: registerDto.phone,
        role: registerDto.role,
        password: hashedPassword,
      } as User;

      userRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('mock-jwt-token');

      const result = await service.register(registerDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(userRepository.create).toHaveBeenCalledWith({
        ...registerDto,
        password: hashedPassword,
      });
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(result).toBe('mock-jwt-token');
    });

    it('should throw USER_EXISTS error when email already exists', async () => {
      const existingUser = {
        id: 1,
        email: registerDto.email,
      } as User;

      userRepository.findOne.mockResolvedValue(existingUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        new HttpException(
          { code: 'USER_EXISTS', status: HttpStatus.CONFLICT },
          HttpStatus.CONFLICT,
        ),
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should throw REGISTER_ERROR on database failure', async () => {
      userRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      userRepository.create.mockReturnValue({} as User);
      userRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.register(registerDto)).rejects.toThrow(
        new HttpException(
          { code: 'REGISTER_ERROR', status: HttpStatus.INTERNAL_SERVER_ERROR },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginAuthDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser = {
      id: 1,
      nombre: 'Test User',
      email: loginDto.email,
      password: 'hashedPassword123',
      role: UserEnum.USER,
    } as User;

    it('should login user successfully with valid credentials', async () => {
      userRepository.findOneBy.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValue('mock-jwt-token');

      const result = await service.login(loginDto);

      expect(userRepository.findOneBy).toHaveBeenCalledWith({
        email: loginDto.email,
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(result).toEqual({
        access_token: 'mock-jwt-token',
        user: {
          id: mockUser.id,
          name: mockUser.nombre,
          email: mockUser.email,
          role: mockUser.role,
        },
      });
    });

    it('should throw USER_NOT_FOUND when user does not exist', async () => {
      userRepository.findOneBy.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        new HttpException(
          { code: 'USER_NOT_FOUND', status: HttpStatus.NOT_FOUND },
          HttpStatus.NOT_FOUND,
        ),
      );

      expect(userRepository.findOneBy).toHaveBeenCalledWith({
        email: loginDto.email,
      });
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UNAUTHORIZED_USER when password is incorrect', async () => {
      userRepository.findOneBy.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        new HttpException(
          { code: 'UNAUTHORIZED_USER', status: HttpStatus.UNAUTHORIZED },
          HttpStatus.UNAUTHORIZED,
        ),
      );

      expect(userRepository.findOneBy).toHaveBeenCalledWith({
        email: loginDto.email,
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
    });

    it('should throw LOGIN_ERROR on unexpected error', async () => {
      userRepository.findOneBy.mockRejectedValue(new Error('Database error'));

      await expect(service.login(loginDto)).rejects.toThrow(
        new HttpException(
          { code: 'LOGIN_ERROR', status: HttpStatus.INTERNAL_SERVER_ERROR },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('validateToken', () => {
    it('should return valid true for valid token', async () => {
      const mockToken = 'valid-jwt-token';
      const mockDecoded = {
        sub: 1,
        email: 'test@example.com',
        role: UserEnum.USER,
      };

      mockJwtService.verify.mockReturnValue(mockDecoded);

      const result = await service.validateToken(mockToken);

      expect(mockJwtService.verify).toHaveBeenCalledWith(mockToken, {
        secret: 'super-secret-jwt',
      });
      expect(result).toEqual({
        valid: true,
        user: mockDecoded,
      });
    });

    it('should return valid false for invalid token', async () => {
      const mockToken = 'invalid-jwt-token';
      const errorMessage = 'jwt malformed';

      mockJwtService.verify.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      const result = await service.validateToken(mockToken);

      expect(mockJwtService.verify).toHaveBeenCalledWith(mockToken, {
        secret: 'super-secret-jwt',
      });
      expect(result).toEqual({
        valid: false,
        error: errorMessage,
      });
    });

    it('should return valid false for expired token', async () => {
      const mockToken = 'expired-jwt-token';
      const errorMessage = 'jwt expired';

      mockJwtService.verify.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      const result = await service.validateToken(mockToken);

      expect(result).toEqual({
        valid: false,
        error: errorMessage,
      });
    });
  });
});
