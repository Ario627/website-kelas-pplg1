import { AnnouncementPriority } from "../entities/announcements.entities";
import  {Transform} from "class-transformer";
import { IsEnum, IsOptional, IsNotEmpty, IsDateString, MaxLength, IsBoolean } from "class-validator";

export class CreateAnnouncementDto {
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(250, { message: 'Title must be at most 250 characters long' })
  title: string;

  @IsNotEmpty({ message: 'Content is required' })
  content: string;

  @IsOptional()
  @IsEnum(AnnouncementPriority, { message: 'Priority must be one of: low, medium, high, urgent' })
  priority?: AnnouncementPriority;

  @IsOptional()
  @Transform(({value}) => value === 'true' || value === true)
  @IsBoolean()
  enableViews?: boolean;

  @IsOptional()
  @Transform(({value}) => value === 'true' || value === true)
  @IsBoolean()
  enableReactions?: boolean;

  @IsOptional()
  @IsDateString({}, { message: 'expiresAt must be a valid ISO 8601 date string' })
  expiresAt?: Date;
}
