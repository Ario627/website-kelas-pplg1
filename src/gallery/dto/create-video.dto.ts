import {
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsInt,
  IsBoolean,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVideoDto {
  @IsNotEmpty({ message: 'Title wajib diisi' })
  @MaxLength(200)
  title: string;

  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsNotEmpty({ message: 'YouTube video ID wajib diisi' })
  @Matches(/^[a-zA-Z0-9_-]{11}$/, {
    message: 'YouTube video ID harus 11 karakter (format: dQw4w9WgXcQ)',
  })
  youtubeVideoId: string;

  @IsOptional()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsArray()
  @MaxLength(50, { each: true })
  tags?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
