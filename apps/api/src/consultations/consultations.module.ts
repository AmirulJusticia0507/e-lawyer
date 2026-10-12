import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { IntegrityModule } from '../integrity/integrity.module';
import { ConsultationsController } from './consultations.controller';
import { ConsultationsGateway } from './consultations.gateway';
import { ConsultationsService } from './consultations.service';

@Module({
  imports: [JwtModule.register({}), IntegrityModule],
  controllers: [ConsultationsController],
  providers: [ConsultationsService, ConsultationsGateway],
  exports: [ConsultationsService],
})
export class ConsultationsModule {}