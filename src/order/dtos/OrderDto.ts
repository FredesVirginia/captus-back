import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';


export class OrderItemDto {
  @Type(() => Number)
  @IsNumber()
  plantId: number;

  @Type(() => Number)
  @IsNumber()
  quantity: number;
}
export class CreateOrdenDto {
 @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsNumber()
  userId: number;
}
