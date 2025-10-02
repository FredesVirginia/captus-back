import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FloorsService } from './floors.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateFloorDto } from './dtos/CreateFloorDto';
import { CreateOfertaDto } from './dtos/OfertaDto';
import { CreateComboDto } from './dtos/ComboDto';
import { Roles } from 'src/auth/roles.decorator';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { RolesGuard } from 'src/auth/roles.guard';

@Controller('floors')
export class FloorsController {
  constructor(private readonly floorsService: FloorsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('upload-image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateFloorDto,
  ) {
    const uploaded = await this.floorsService.uploadImage(file, dto);
    return uploaded;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('/create-oferta')
  async createOferta(@Body() dto: CreateOfertaDto) {
    return await this.floorsService.createOfertaFloor(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('/create-combo')
  async createCombo(@Body() dto: CreateComboDto) {
    return await this.floorsService.createCombo(dto);
  }

  @Get()
  async getFloors() {
    return await this.floorsService.getAllFloors();
  }

  @Get('/ofertas')
  async getOfertas() {
    return await this.floorsService.getAllOfertas();
  }

  @Get('/combos')
  async getCombos() {
    return await this.floorsService.getAllCombos();
  }
}
