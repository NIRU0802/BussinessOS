import { IsString, Length, Matches } from 'class-validator';

export class ResolveQrDto {
  @IsString()
  @Length(16, 128)
  @Matches(/^[A-Za-z0-9_-]+$/)
  token!: string;
}
