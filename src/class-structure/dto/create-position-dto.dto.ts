import { IsNotEmpty, IsInt, IsOptional, MaxLength, Min } from 'class-validator';

export class CreatePositionDto {
  @IsNotEmpty({ message: 'Position name is required' })
  @MaxLength(100, { message: 'Position name must be at most 100 characters long' })
  positionName: string;

  @IsInt({ message: 'Member ID must be an integer' })
  memberId: number;

  @IsOptional()
  @IsInt({ message: 'Order must be an integer' })
  @Min(1, { message: 'Order must be at least 1' })
  order?: number;
}
