import { Module } from '@nestjs/common';
import { FloorsController } from './floors.controller';
import { FloorsService } from './floors.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Floor } from './entity/floor.entity';
import { Oferta } from './entity/oferta.entity';
import { Combo } from './entity/combo.entity';
import { ComboItem } from './entity/comboItem.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Floor , Oferta , Combo , ComboItem]) ,  AuthModule,],
  controllers: [FloorsController],
  providers: [FloorsService]
})
export class FloorsModule {}
