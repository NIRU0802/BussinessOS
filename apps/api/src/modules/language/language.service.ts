import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SetLanguagesDto } from './dto/set-languages.dto';

@Injectable()
export class LanguageService {
  constructor(private readonly prisma: PrismaService) {}

  async getTenantLanguages(tenantId: string) {
    const setting = await this.prisma.tenantLocaleSetting.findUnique({
      where: { tenantId },
    });
    return {
      supportedLanguages: (setting?.supportedLanguages as string[]) ?? ['en'],
      defaultLanguage: setting?.defaultLanguage ?? 'en',
    };
  }

  async setTenantLanguages(tenantId: string, dto: SetLanguagesDto) {
    if (!dto.languages.includes(dto.defaultLanguage)) {
      throw new BadRequestException(
        'defaultLanguage must be included in languages list',
      );
    }
    return this.prisma.tenantLocaleSetting.upsert({
      where: { tenantId },
      update: {
        supportedLanguages: dto.languages,
        defaultLanguage: dto.defaultLanguage,
      },
      create: {
        tenantId,
        supportedLanguages: dto.languages,
        defaultLanguage: dto.defaultLanguage,
      },
    });
  }

  async resolveLanguage(
    tenantId: string,
    requestedLang?: string,
  ): Promise<string> {
    const { supportedLanguages, defaultLanguage } =
      await this.getTenantLanguages(tenantId);
    if (requestedLang && supportedLanguages.includes(requestedLang)) {
      return requestedLang;
    }
    return defaultLanguage;
  }
}
