import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateExpenseDto } from './create-expense.dto';

// branchId is intentionally not editable after creation to keep branch-scoped
// reporting consistent; delete and re-create if the branch was wrong.
export class UpdateExpenseDto extends PartialType(
  OmitType(CreateExpenseDto, ['branchId'] as const),
) {}
