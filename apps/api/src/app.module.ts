import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CasesModule } from './cases/cases.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { validateEnv } from './config/env.validation';
import { getEnvironmentFilePaths } from './config/environment-files';
import { PrismaModule } from './prisma/prisma.module';
import { ClientsModule } from './clients/clients.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { LegalSourcesModule } from './legal-sources/legal-sources.module';
import { IntegrityModule } from './integrity/integrity.module';
import { DocumentsModule } from './documents/documents.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvironmentFilePaths(),
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    ClientsModule,
    CasesModule,
    ConsultationsModule,
    LegalSourcesModule,
    IntegrityModule,
    DocumentsModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}
