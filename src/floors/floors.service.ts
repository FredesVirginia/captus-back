import { Injectable, UploadedFile } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { put } from '@vercel/blob';
import { Express } from 'express';
import { Floor } from './entity/floor.entity';
import { Repository } from 'typeorm';
import { CreateFloorDto } from './dtos/CreateFloorDto';
@Injectable()
export class FloorsService {

    constructor(
        @InjectRepository(Floor)
        private floorRepository: Repository<Floor>
    ){}
  async uploadImage(@UploadedFile() file: Express.Multer.File , createdFloorDto : CreateFloorDto) {
    const blob = await put(file.originalname, file.buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: true,
    });

    const saved = await this.floorRepository.save({
        ...createdFloorDto,
        imagenUrl :blob.url,
        
    })

    // Aquí puedes retornar el URL para confirmar subida o guardarlo en DB
    return { data:saved };
  }
}
