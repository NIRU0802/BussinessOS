export interface TaxComponent {
  label: string;
  rate: number; // percentage, e.g. 2.5 means 2.5%
}

export interface TaxResolutionInput {
  tenantId: string;
  country: string;
  state?: string;
  taxClassId: string;
  amount: number; // pre-tax amount
  asOf?: Date;
}

export interface TaxResolutionResult {
  taxType: string;
  components: TaxComponent[];
  totalTaxAmount: number;
  totalTaxRate: number;
  grandTotal: number;
}
