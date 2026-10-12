import { Module } from '@nestjs/common';
import { HearingsController } from './hearings.controller';
import { HearingsService } from './hearings.service';
import { PostponementService } from './postponement.service';
import { ReminderService } from './reminder.service';
import { SlaService } from './sla.service';

@Module({
  controllers: [HearingsController],
  providers: [HearingsService, SlaService, PostponementService, ReminderService],
  exports: [HearingsService, SlaService, PostponementService, ReminderService],
})
export class HearingsModule {}
