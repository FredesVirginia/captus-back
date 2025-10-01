import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from './dtos/auth.dto';
import { LoginAuthDto } from './dtos/login.auth.dto';



@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('auth_register')
  register(@Body() dto: AuthDto) {
    return this.authService.register(dto);
  }

  @Post('auth_login')
  login(@Body() dto: LoginAuthDto) {
    console.log("data" , dto)
    return this.authService.login(dto);
  }

  @Post('auth_validate')
  async validate(@Body() payload: { token: string }) {
    return this.authService.validateToken(payload.token);
  }
}