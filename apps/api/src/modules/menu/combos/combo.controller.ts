import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ComboService } from './combo.service';
import { CreateComboDto } from '../dto/create-combo.dto';
import { UpdateComboDto } from '../dto/update-combo.dto';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { MinioService } from '../../../common/storage/minio.service';
import { TenantContextService } from '../../../common/tenant-context/tenant-context.service';

@Controller('menu/combos')
export class ComboController {
  constructor(
    private readonly comboService: ComboService,
    private readonly minioService: MinioService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Get()
  @RequirePermissions('menu.read')
  list() {
    return this.comboService.list();
  }

  @Get(':id')
  @RequirePermissions('menu.read')
  findOne(@Param('id') id: string) {
    return this.comboService.findOne(id);
  }

  @Post()
  @RequirePermissions('menu.write')
  create(@Body() dto: CreateComboDto) {
    return this.comboService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('menu.write')
  update(@Param('id') id: string, @Body() dto: UpdateComboDto) {
    return this.comboService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('menu.write')
  remove(@Param('id') id: string) {
    return this.comboService.softDelete(id);
  }

  @Post(':id/image')
  @RequirePermissions('menu.write')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
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
      namespace: 'combos',
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalFilename: file.originalname,
    });

    return this.comboService.setImageKey(id, objectKey);
  }
}
