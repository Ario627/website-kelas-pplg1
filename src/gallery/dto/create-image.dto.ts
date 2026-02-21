import { Transform, Type } from "class-transformer";
import {
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsInt,
  IsBoolean,
  MaxLength
} from 'class-validator';

export class CreateImageDto {
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(200)
  title: string;

  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',').map((t: string) => t.trim()).filter(Boolean);
    return value;
  })
  @IsArray()
  @MaxLength(59, { each: true })
  tags?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPublished?: boolean;
}
