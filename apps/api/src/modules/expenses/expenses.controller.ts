import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RequiresWidget } from '../widgets/decorators/requires-widget.decorator';
import { TenantContextService } from '../../common/tenant-context/tenant-context.service';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';

const RECEIPT_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_RECEIPT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

@UseGuards(AuthGuard('jwt'))
@RequiresWidget('expenses')
@Controller('expenses')
export class ExpensesController {
  constructor(
    private readonly expensesService: ExpensesService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Get()
  @RequirePermissions('expenses.read')
  findAll(@Query() query: QueryExpensesDto) {
    return this.expensesService.findAll(this.tenantContext.getContext(), query);
  }

  @Get(':id')
  @RequirePermissions('expenses.read')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.expensesService.findOne(this.tenantContext.getContext(), id);
  }

  @Post()
  @RequirePermissions('expenses.create')
  @UseInterceptors(
    FileInterceptor('receipt', {
      limits: { fileSize: RECEIPT_MAX_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_RECEIPT_MIME_TYPES.includes(file.mimetype)) {
          return callback(
            new Error('Only JPEG, PNG, WEBP, or PDF receipts are allowed'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  create(
    @Body() dto: CreateExpenseDto,
    @UploadedFile() receipt?: Express.Multer.File,
  ) {
    return this.expensesService.create(
      this.tenantContext.getContext(),
      dto,
      receipt,
    );
  }

  @Patch(':id')
  @RequirePermissions('expenses.update')
  @UseInterceptors(
    FileInterceptor('receipt', {
      limits: { fileSize: RECEIPT_MAX_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_RECEIPT_MIME_TYPES.includes(file.mimetype)) {
          return callback(
            new Error('Only JPEG, PNG, WEBP, or PDF receipts are allowed'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseDto,
    @UploadedFile() receipt?: Express.Multer.File,
  ) {
    return this.expensesService.update(
      this.tenantContext.getContext(),
      id,
      dto,
      receipt,
    );
  }

  @Delete(':id')
  @RequirePermissions('expenses.delete')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.expensesService.remove(this.tenantContext.getContext(), id);
  }
}
