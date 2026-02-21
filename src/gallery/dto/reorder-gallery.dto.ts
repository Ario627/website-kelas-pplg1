import { IsArray, ValidateNested, IsInt } from "class-validator";
import { Type } from "class-transformer";

class ReorderItem {
  @IsInt()
  id: number;

  @IsInt()
  order: number;
}

export class ReorderGalleryDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItem)
  items: ReorderItem[];
}
