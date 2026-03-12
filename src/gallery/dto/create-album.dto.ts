import {
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsInt,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAlbumDto {
  @IsNotEmpty({ message: 'Title wajib diisi' })
  @MaxLength(250)
  title: string;

  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  itemIds?: number[];
}
