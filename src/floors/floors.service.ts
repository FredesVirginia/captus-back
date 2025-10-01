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
import { all } from 'axios';
@Injectable()
export class FloorsService {
  constructor(
    @InjectRepository(Floor)
    private floorRepository: Repository<Floor>,
    @InjectRepository(Oferta)
    private ofertaRepository: Repository<Oferta>,
    @InjectRepository(Combo)
    private comboRepository: Repository<Combo>,
  ) { }
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
    const allFloor = await this.floorRepository.find({
      relations: ['oferta'],
    });
    if (allFloor.length > 0) {
      return allFloor.map((floor) => {
        let precioFinal = floor.precio;
        if (floor.oferta) {
          precioFinal = precioFinal - (precioFinal * floor.oferta.descuento) / 100;
          return { 
            ...floor, 
            precioFinal: precioFinal.toFixed(2), };
        }
        return  {...floor}
      });
    }

    return [];
  }

  async getAllOfertas() {
    const allFloor = await this.ofertaRepository.find({ relations: ['plantas'] });
    let descuento = allFloor[0].descuento
    let floors = allFloor[0].plantas
    const ofertas = floors.map((floor)=>{
     return {
       ...floor,
      precioFinal :  (floor.precio - (floor.precio * descuento)/100).toFixed(2)

     }

    })

    return {
      data : allFloor.map(({ plantas, ...resto }) => resto),
      ofertas
    }


  }
  async getAllCombos() {
    return await this.comboRepository.find({ relations: ['items', 'items.planta'] });
  }

  async createOfertaFloor(oferta: CreateOfertaDto) {
    try {
      console.log("LA DATA QUE LLEGA", oferta);
      const plantas = await this.floorRepository.findBy({
        id: In(oferta.plantasIds),
      });

      if (plantas.length !== oferta.plantasIds.length) {
        throw new NotFoundException('Una o mas Plantas no existen');
      }

      const nuevaOferta = this.ofertaRepository.create({
        nombre: oferta.nombre,
        descuento: oferta.descuento,
        fechaInicio: oferta.fechaInicio,
        fechaFin: oferta.fechaFin,
        plantas,
      });

      const saveOfertas = await this.ofertaRepository.save(nuevaOferta);

      return saveOfertas;
    } catch (error) {
      console.log("Errrror",error);
      throw new ExceptionsHandler();
    }
  }

  async createCombo(comboDto: CreateComboDto) {
    const newCombo = this.comboRepository.create({
      nombre: comboDto.nombre,
      descripcion: comboDto.descripcion,
      precio: comboDto.precio,
      activo: comboDto.activo,
      items: comboDto.items.map(item => ({
        planta: { id: item.plantaId } as Floor,
        cantidad: item.cantidad,
      })),
      
    })
    const savedCombo = await this.comboRepository.save(newCombo);
    return savedCombo;

    
  }
}
