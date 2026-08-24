import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { ExpenseCategoriesController } from './expense-categories.controller';
import { ExpenseCategoriesService } from './expense-categories.service';
import { PnlController } from './pnl.controller';
import { PnlService } from './pnl.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [ExpensesController, ExpenseCategoriesController, PnlController],
  providers: [ExpensesService, ExpenseCategoriesService, PnlService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
