import { Module } from '@nestjs/common';
import { FloorsController } from './floors.controller';
import { FloorsService } from './floors.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Floor } from './entity/floor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Floor])],
  controllers: [FloorsController],
  providers: [FloorsService]
})
export class FloorsModule {}
