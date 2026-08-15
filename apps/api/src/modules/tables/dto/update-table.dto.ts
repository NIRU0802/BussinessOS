import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateTableDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  capacity?: number;

  @IsOptional()
  @IsString()
  isActive?: boolean;
}
