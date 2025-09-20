import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FloorsService } from './floors.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateFloorDto } from './dtos/CreateFloorDto';

@Controller('floors')
export class FloorsController {
  constructor(private readonly floorsService: FloorsService) {}

  @Post('upload-image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateFloorDto,
  ) {
    console.log('DATA', dto);
    const uploaded = await this.floorsService.uploadImage(file, dto);
    return uploaded;
  }

  @Get()
  async getFloors() {
    return await this.floorsService.getAllFloors();
  }
}
