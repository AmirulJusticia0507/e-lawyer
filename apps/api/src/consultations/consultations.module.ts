import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConsultationsController } from './consultations.controller';
import { ConsultationsGateway } from './consultations.gateway';
import { ConsultationsService } from './consultations.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [ConsultationsController],
  providers: [ConsultationsService, ConsultationsGateway],
})
export class ConsultationsModule {}