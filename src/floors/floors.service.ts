import { HttpException, HttpStatus, Injectable, UploadedFile } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { put } from '@vercel/blob';
import { In, Repository } from 'typeorm';
import { CreateComboDto } from './dtos/ComboDto';
import { CreateFloorDto } from './dtos/CreateFloorDto';
import { CreateOfertaDto } from './dtos/OfertaDto';
import { Combo } from './entity/combo.entity';
import { Floor } from './entity/floor.entity';
import { Oferta } from './entity/oferta.entity';

@Injectable()
export class FloorsService {
  constructor(
    @InjectRepository(Floor)
    private floorRepository: Repository<Floor>,
    @InjectRepository(Oferta)
    private ofertaRepository: Repository<Oferta>,
    @InjectRepository(Combo)
    private comboRepository: Repository<Combo>,
  ) {}

  async uploadImage(
  @UploadedFile() file: Express.Multer.File,
  createdFloorDto: CreateFloorDto,
) {
  try {
    if (!file) {
      throw new HttpException(
        { code: 'NO_FILE_PROVIDED', status: HttpStatus.BAD_REQUEST },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Subir al blob (puede fallar por token o conexión)
    let blob;
    try {
      blob = await put(file.originalname, file.buffer, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
        addRandomSuffix: true,
      });
    } catch (error) {
      console.error('❌ Error uploading to Blob:', error);
      throw new HttpException(
        { code: 'BLOB_UPLOAD_FAILED', status: HttpStatus.INTERNAL_SERVER_ERROR },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Guardar en la base (puede fallar por validación, constraints, etc.)
    try {
      const saved = await this.floorRepository.save({
        ...createdFloorDto,
        imagenUrl: blob.url,
      });

      return { data: saved };
    } catch (error) {
      console.error('❌ Error saving floor:', error);
      throw new HttpException(
        { code: 'DATABASE_SAVE_FAILED', status: HttpStatus.INTERNAL_SERVER_ERROR },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  } catch (error) {
    console.error('🚨 Error in uploadImage():', error);

    if (error instanceof HttpException) throw error;

    throw new HttpException(
      { code: 'UPLOAD_IMAGE_ERROR', status: HttpStatus.INTERNAL_SERVER_ERROR },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}


  async getAllFloors() {
  try {
    const allFloor = await this.floorRepository.find({
      relations: ['oferta'],
    });

    // Si no hay resultados, devolvemos un array vacío
    if (!allFloor || allFloor.length === 0) {
      return [];
    }

    // Calculamos el precio final si hay una oferta
    const floorsWithPrice = allFloor.map((floor) => {
      let precioFinal = floor.precio;

      if (floor.oferta) {
        const descuento = Number(floor.oferta.descuento);

        if (isNaN(descuento)) {
          throw new HttpException(
            { code: 'INVALID_DISCOUNT_VALUE', status: HttpStatus.BAD_REQUEST },
            HttpStatus.BAD_REQUEST,
          );
        }

        precioFinal = precioFinal - (precioFinal * descuento) / 100;

        return {
          ...floor,
          precioFinal: precioFinal.toFixed(2),
        };
      }

      return { ...floor };
    });

    return floorsWithPrice;
  } catch (error) {
    console.error('🚨 Error in getAllFloors():', error);

    // Si ya es una excepción HTTP personalizada, la reenviamos
    if (error instanceof HttpException) throw error;

    // Si es un error inesperado, devolvemos una genérica
    throw new HttpException(
      { code: 'GET_FLOORS_ERROR', status: HttpStatus.INTERNAL_SERVER_ERROR },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}


  async getAllOfertas() {
  try {
    const allFloor = await this.ofertaRepository.find({
      relations: ['plantas'],
    });

    // Si no hay ofertas, devolvemos array vacío
    if (!allFloor || allFloor.length === 0) {
      return { data: [], ofertas: [] };
    }

    // Validamos que la primera oferta tenga descuento y plantas válidas
    const firstOffer = allFloor[0];

    if (typeof firstOffer.descuento !== 'number' || isNaN(firstOffer.descuento)) {
      throw new HttpException(
        { code: 'INVALID_DISCOUNT_VALUE', status: HttpStatus.BAD_REQUEST },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!firstOffer.plantas || firstOffer.plantas.length === 0) {
      throw new HttpException(
        { code: 'NO_PLANTS_FOUND', status: HttpStatus.NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }

    const descuento = firstOffer.descuento;
    const floors = firstOffer.plantas;

    // Calculamos el precio final
    const ofertas = floors.map((floor) => {
      const precioFinal = floor.precio - (floor.precio * descuento) / 100;

      return {
        ...floor,
        precioFinal: precioFinal.toFixed(2),
      };
    });

    // Devolvemos los datos sin la relación "plantas" para cada oferta
    const data = allFloor.map(({ plantas, ...resto }) => resto);

    return { data, ofertas };
  } catch (error) {
    console.error('🚨 Error in getAllOfertas():', error);

    if (error instanceof HttpException) throw error;

    throw new HttpException(
      { code: 'GET_OFFERS_ERROR', status: HttpStatus.INTERNAL_SERVER_ERROR },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

  async getAllCombos() {
  try {
    const combos = await this.comboRepository.find({
      relations: ['items', 'items.planta'],
    });

    // Si no hay combos registrados
    if (!combos || combos.length === 0) {
      return { data: [] };
    }

  

   
  } catch (error) {
    console.error('🚨 Error in getAllCombos():', error);

    if (error instanceof HttpException) throw error;

    throw new HttpException(
      { code: 'GET_COMBOS_ERROR', status: HttpStatus.INTERNAL_SERVER_ERROR },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}


 async createOfertaFloor(oferta: CreateOfertaDto) {
  try {
    const plantas = await this.floorRepository.findBy({
      id: In(oferta.plantasIds),
    });

    if (plantas.length !== oferta.plantasIds.length) {
       throw new HttpException(
      { code: 'FLOOR_NOT_FOUND', status : HttpStatus.NOT_FOUND},
      HttpStatus.NOT_FOUND,
    );
    }

    const nuevaOferta = this.ofertaRepository.create({
      nombre: oferta.nombre,
      descuento: oferta.descuento,
      fechaInicio: oferta.fechaInicio,
      fechaFin: oferta.fechaFin,
      plantas,
    });

    const saveOferta = await this.ofertaRepository.save(nuevaOferta);

    return { data: saveOferta };
  } catch (error) {
    console.error('🚨 Error en createOfertaFloor():', error);

    if (error instanceof HttpException) throw error;

    throw new HttpException(
      { code: 'CREATE_OFERTA_ERROR', message: 'Error al crear la oferta' },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}


 async createCombo(comboDto: CreateComboDto) {
  try {
    // Verificamos que las plantas existan
    const plantasIds = comboDto.items.map((item) => item.plantaId);
    const plantas = await this.floorRepository.findBy({ id: In(plantasIds) });

    if (plantas.length !== plantasIds.length) {
     throw new HttpException(
        { code: 'NO_PLANTS_FOUND', status: HttpStatus.NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }

    // Creamos el combo
    const newCombo = this.comboRepository.create({
      nombre: comboDto.nombre,
      descripcion: comboDto.descripcion,
      precio: comboDto.precio,
      activo: comboDto.activo,
      items: comboDto.items.map((item) => ({
        planta: { id: item.plantaId } as Floor,
        cantidad: item.cantidad,
      })),
    });

    const savedCombo = await this.comboRepository.save(newCombo);

    return { data: savedCombo };
  } catch (error) {
    console.error('🚨 Error en createCombo():', error);

    if (error instanceof HttpException) throw error;

    throw new HttpException(
      { code: 'CREATE_COMBO_ERROR', message: 'Error al crear el combo' },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

}
