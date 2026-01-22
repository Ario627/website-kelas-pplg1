import { GalleryType } from "../entities/gallery.entities";
import {
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  MaxLength,
  Matches,
  ValidateIf,
} from "class-validator";

export class CreateGalleryItemDtp {
  @IsNotEmpty({ message: "Title is required" })
  @MaxLength(200, { message: "Title must be at most 200 characters long" })
  title: string;

  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(GalleryType)
  type?: GalleryType;

  //Require for video
  @ValidateIf((o) => o.type === GalleryType.VIDEO)
  @IsNotEmpty({ message: "YouTube video ID is required for video type" })
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_-]{11}$/, {
    message: "YouTube video ID must be a valid format",
  })
  youtubeVideoId?: string;

  @IsOptional()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsArray()
  @MaxLength(50, { each: true })
  tags?: string[];

  @IsOptional()
  @IsInt()
  order?: number;
}
