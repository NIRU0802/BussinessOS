import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class UpdateKdsSettingsDto {
  @IsBoolean()
  ticketPrintingEnabled: boolean;

  @ValidateIf((dto: UpdateKdsSettingsDto) => dto.ticketPrintingEnabled === true)
  @IsIn(['network', 'usb'])
  printerConnectionType?: 'network' | 'usb';

  @ValidateIf(
    (dto: UpdateKdsSettingsDto) => dto.printerConnectionType === 'network',
  )
  @IsString()
  printerHost?: string;

  @ValidateIf(
    (dto: UpdateKdsSettingsDto) => dto.printerConnectionType === 'network',
  )
  @IsInt()
  printerPort?: number;

  @IsOptional()
  @IsString()
  printerConnectionTypeRaw?: string;
}
