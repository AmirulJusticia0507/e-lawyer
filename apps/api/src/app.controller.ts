import { Controller, Get } from '@nestjs/common';
import {
  AmendmentType,
  CaseStatus,
  CitationValidationStatus,
  ClientType,
  ConsultationMode,
  ConsultationStatus,
  InteractionType,
  Jurisdiction,
  JurisprudenceStatus,
  LegalSourceStatus,
  MessageType,
  PartySide,
  RegulationType,
  VideoSessionStatus,
} from '@prisma/client';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  info() {
    return {
      name: 'e-Lawyer API',
      version: '0.3.0',
      status: 'ok',
    };
  }

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('meta')
  meta() {
    return {
      clientTypes: Object.values(ClientType),
      jurisdictions: Object.values(Jurisdiction),
      caseStatuses: Object.values(CaseStatus),
      partySides: Object.values(PartySide),
      interactionTypes: Object.values(InteractionType),
      consultationModes: Object.values(ConsultationMode),
      consultationStatuses: Object.values(ConsultationStatus),
      messageTypes: Object.values(MessageType),
      videoSessionStatuses: Object.values(VideoSessionStatus),
      regulationTypes: Object.values(RegulationType),
      legalSourceStatuses: Object.values(LegalSourceStatus),
      amendmentTypes: Object.values(AmendmentType),
      citationValidationStatuses: Object.values(CitationValidationStatus),
      jurisprudenceStatuses: Object.values(JurisprudenceStatus),
    };
  }
}