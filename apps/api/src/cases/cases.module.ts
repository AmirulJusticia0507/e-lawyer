import { Module } from '@nestjs/common';
import { IntegrityModule } from '../integrity/integrity.module';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';

@Module({
  imports: [IntegrityModule],
  controllers: [CasesController],
  providers: [CasesService],
})
export class CasesModule {}