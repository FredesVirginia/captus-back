import { Injectable, NotFoundException, UploadedFile } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { put } from '@vercel/blob';
import { Express } from 'express';
import { Floor } from './entity/floor.entity';
import { In, Repository } from 'typeorm';
import { CreateFloorDto } from './dtos/CreateFloorDto';
import { Oferta } from './entity/oferta.entity';
import { CreateOfertaDto } from './dtos/OfertaDto';
import { ExceptionsHandler } from '@nestjs/core/exceptions/exceptions-handler';
import { CreateComboDto } from './dtos/ComboDto';
import { Combo } from './entity/combo.entity';
@Injectable()
export class FloorsService {
  constructor(
    @InjectRepository(Floor)
    private floorRepository: Repository<Floor>,
    @InjectRepository(Oferta)
    private ofertaRepository: Repository<Oferta>,
    private comboRepository: Repository<Combo>,
  ) {}
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    createdFloorDto: CreateFloorDto,
  ) {
    const blob = await put(file.originalname, file.buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: true,
    });

    const saved = await this.floorRepository.save({
      ...createdFloorDto,
      imagenUrl: blob.url,
    });

    // Aquí puedes retornar el URL para confirmar subida o guardarlo en DB
    return { data: saved };
  }

  async getAllFloors() {
    const allFloor = await this.floorRepository.find();
    if (allFloor.length > 0) {
      return allFloor;
    }
    return [];
  }

  async createOfertaFloor(oferta: CreateOfertaDto) {
    try {
      const plantas = await this.floorRepository.findBy({
        id: In(oferta.plantasIds),
      });

      if (plantas.length !== oferta.plantasIds.length) {
        throw new NotFoundException('Una o mas Plantas no existen');
      }

      const nuevaOferta = this.ofertaRepository.create({
        descuento: oferta.descuento,
        fechaInicio: oferta.fechaInicio,
        fechaFin: oferta.fechaFin,
        plantas,
      });

      const saveOfertas = await this.ofertaRepository.save(nuevaOferta);

      return saveOfertas;
    } catch (error) {
      throw new ExceptionsHandler();
    }
  }

  async createCombo(comboDto: CreateComboDto) {
    const newCombo = await this.comboRepository.create(comboDto);
    const savedCombo = await this.comboRepository.save(newCombo);
    const comboSaved = await this.comboRepository.findOne({
      where: { id: savedCombo.id },
      relations: ['items'],
    });

    return comboSaved;
  }
}
