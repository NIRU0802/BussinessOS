import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../common/storage/minio.service';
import { TenantContextService } from '../../common/tenant-context/tenant-context.service';
import { UpdateBrandingDto } from './dto/update-branding.dto';

@Injectable()
export class BrandingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async getBranding(tenantId: string) {
    return this.prisma.forTenant(tenantId, async (tx) => {
      const branding = await tx.tenantBranding.findUnique({
        where: { tenantId },
      });

      if (!branding) {
        return this.getDefaults();
      }

      const logoUrl = branding.logoObjectKey
        ? await this.minioService.getSignedReadUrl(branding.logoObjectKey)
        : null;

      const faviconUrl = branding.faviconObjectKey
        ? await this.minioService.getSignedReadUrl(branding.faviconObjectKey)
        : null;

      const defaults = this.getDefaults();

      return {
        businessName: branding.businessName,
        logoUrl,
        faviconUrl,
        primaryColor: branding.primaryColor ?? defaults.primaryColor,
        primaryColorDark:
          branding.primaryColorDark ?? defaults.primaryColorDark,
        inkColor: branding.inkColor ?? defaults.inkColor,
        surfaceColor: branding.surfaceColor ?? defaults.surfaceColor,
        fontDisplay: branding.fontDisplay ?? defaults.fontDisplay,
        receiptFooterText: branding.receiptFooterText,
      };
    });
  }

  async updateBranding(tenantId: string, dto: UpdateBrandingDto) {
    await this.prisma.forTenant(tenantId, (tx) =>
      tx.tenantBranding.upsert({
        where: { tenantId },
        create: { tenantId, ...dto },
        update: { ...dto },
      }),
    );

    return this.getBranding(tenantId);
  }

  async uploadLogo(file: Express.Multer.File) {
    if (!file || file.size === 0 || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded file is empty');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Image must be under 5MB');
    }

    const tenantId = this.tenantContext.getTenantId();
    const { objectKey } = await this.minioService.uploadFile({
      tenantId,
      namespace: 'branding',
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalFilename: file.originalname,
    });

    await this.prisma.forTenant(tenantId, (tx) =>
      tx.tenantBranding.upsert({
        where: { tenantId },
        create: { tenantId, logoObjectKey: objectKey },
        update: { logoObjectKey: objectKey },
      }),
    );

    return this.getBranding(tenantId);
  }

  private getDefaults() {
    return {
      businessName: null,
      logoUrl: null,
      faviconUrl: null,
      primaryColor: '#0F172A',
      primaryColorDark: '#020617',
      inkColor: '#171717',
      surfaceColor: '#ffffff',
      fontDisplay: 'Inter',
      receiptFooterText: null,
    };
  }
}
