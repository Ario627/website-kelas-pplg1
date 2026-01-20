import { AnnouncementPriority } from "../entities/announcements.entities";
import { IsEnum, IsOptional, IsNotEmpty, IsDateString, MaxLength } from "class-validator";

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
  @IsDateString({}, { message: 'expiresAt must be a valid ISO 8601 date string' })
  expiresAt?: Date;
}
