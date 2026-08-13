import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MenuItemService } from './menu-item.service';
import { CreateMenuItemDto } from '../dto/create-menu-item.dto';
import { UpdateMenuItemDto } from '../dto/update-menu-item.dto';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { MinioService } from '../../../common/storage/minio.service';
import { TenantContextService } from '../../../common/tenant-context/tenant-context.service';

@Controller('menu/items')
export class MenuItemController {
  constructor(
    private readonly menuItemService: MenuItemService,
    private readonly minioService: MinioService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Get()
  @RequirePermissions('menu.read')
  list(@Query('categoryId') categoryId?: string) {
    return this.menuItemService.list(categoryId);
  }

  @Get(':id')
  @RequirePermissions('menu.read')
  findOne(@Param('id') id: string) {
    return this.menuItemService.findOne(id);
  }

  @Post()
  @RequirePermissions('menu.write')
  create(@Body() dto: CreateMenuItemDto) {
    return this.menuItemService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('menu.write')
  update(@Param('id') id: string, @Body() dto: UpdateMenuItemDto) {
    return this.menuItemService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('menu.write')
  remove(@Param('id') id: string) {
    return this.menuItemService.softDelete(id);
  }

  @Post(':id/modifier-groups/:groupId')
  @RequirePermissions('menu.write')
  attachGroup(@Param('id') id: string, @Param('groupId') groupId: string) {
    return this.menuItemService.attachModifierGroup(id, groupId);
  }

  @Delete(':id/modifier-groups/:groupId')
  @RequirePermissions('menu.write')
  detachGroup(@Param('id') id: string, @Param('groupId') groupId: string) {
    return this.menuItemService.detachModifierGroup(id, groupId);
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
      namespace: 'products',
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalFilename: file.originalname,
    });

    return this.menuItemService.setImageKey(id, objectKey);
  }
}
