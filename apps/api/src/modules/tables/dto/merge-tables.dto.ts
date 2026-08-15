import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class MergeTablesDto {
  // The table that survives as the "primary" — orders/QR flow will target
  // this table id going forward while the merge is active.
  @IsUUID()
  primaryTableId: string;

  // The other tables being folded into the primary. Must not include
  // primaryTableId and must all belong to the same branch.
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  tableIdsToMerge: string[];
}
