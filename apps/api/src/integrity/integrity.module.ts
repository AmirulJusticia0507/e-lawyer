import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { IntegrityController } from './integrity.controller';
import { IntegrityGateway } from './integrity.gateway';
import { IntegrityService } from './integrity.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [IntegrityController],
  providers: [IntegrityService, IntegrityGateway],
  exports: [IntegrityService],
})
export class IntegrityModule {}
