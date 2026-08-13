import { Module } from '@nestjs/common';
import { TaxService } from './tax.service';
import { TaxController } from './tax.controller';

@Module({
  controllers: [TaxController],
  providers: [TaxService],
  exports: [TaxService], // other modules (Order Engine) consume this, never the repository
})
export class TaxModule {}
