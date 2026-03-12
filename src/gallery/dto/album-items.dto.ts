import { IsArray, IsInt } from 'class-validator';

export class AlbumItemsDto {
  @IsArray()
  @IsInt({ each: true })
  itemIds: number[];
}
