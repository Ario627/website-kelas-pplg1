import {
  IsOptional,
  IsBoolean,
  IsInt,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAlbumDto {
  @IsOptional()
  @MaxLength(250)
  title?: string;

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
  @Type(() => Number)
  @IsInt()
  coverItemId?: number;
}
