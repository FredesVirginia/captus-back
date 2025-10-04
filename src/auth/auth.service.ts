import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entity/user.entity';
import { Repository } from 'typeorm';

import * as bcrypt from 'bcrypt';
import { AuthDto } from './dtos/auth.dto';
import { LoginAuthDto } from './dtos/login.auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwt: JwtService,
  ) {}

  async register(dto: AuthDto) {
    try {
      // Verificamos si el usuario ya existe
      const existing = await this.userRepo.findOne({
        where: { email: dto.email },
      });
      if (existing) {
        throw new HttpException(
          { code: 'USER_EXISTS', status: HttpStatus.CONFLICT },
          HttpStatus.CONFLICT,
        );
      }

      const hashed = await bcrypt.hash(dto.password, 10);
      const user = this.userRepo.create({ ...dto, password: hashed });
      await this.userRepo.save(user);

      return await this.signToken(user);
    } catch (error) {
      console.error('❌ Error in register():', error);

      if (error instanceof HttpException) throw error;

      throw new HttpException(
        { code: 'REGISTER_ERROR', status: HttpStatus.INTERNAL_SERVER_ERROR },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

    }
  }

  async login(dto: LoginAuthDto) {
    const user = await this.userRepo.findOneBy({ email: dto.email });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const token = await this.signToken(user!); // 👈 Ahora token es string

    return {
      access_token: token, // 👈 ¡Ahora sí correcto!
      user: {
        id: user!.id,
        name: user!.nombre,
        email: user!.email,
        role: user!.role,
      },
    };
  }

  async validateToken(token: string) {
    try {
      const decoded = this.jwt.verify(token, { secret: 'super-secret-jwt' });
      return { valid: true, user: decoded };
    } catch (e) {
      return { valid: false, error: e.message };
    }
  }

  private async signToken(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwt.signAsync(payload); // 👈 Ya no lo envuelvas en { access_token }
  }
}
