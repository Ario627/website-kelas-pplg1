import { PartialType } from '@nestjs/mapped-types';
import { CreateAnnouncementDto } from './create-announcement.dto';
import { Transform } from 'class-transformer';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateAnnouncementDto extends PartialType(CreateAnnouncementDto) {
  @IsOptional()
  @Transform(({value}) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({value}) => value === 'true' || value === true)
  @IsBoolean()
  isPinned?: boolean;
}
