import { ArrayMinSize, IsArray, IsIn, IsString } from 'class-validator';

const SUPPORTED_LANGS = ['en', 'hi', 'mr', 'ar', 'es', 'fr', 'de', 'pt'];

export class SetLanguagesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(SUPPORTED_LANGS, { each: true })
  languages: string[];

  @IsString()
  @IsIn(SUPPORTED_LANGS)
  defaultLanguage: string;
}
