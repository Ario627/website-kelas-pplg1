import { IsOptional, IsNotEmpty, MaxLength, Matches } from "class-validator";

export class UpdateClassDto {
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(100)
  className?: string;


}
