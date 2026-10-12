import { DocumentType } from '@prisma/client';
import { DEFAULT_DOCUMENT_TEMPLATES, hashDocumentContent, renderDocumentTemplate } from './document-content';

describe('document content helpers', () => {
  it('renders known placeholders and preserves unknown placeholders for drafting', () => {
    const result = renderDocumentTemplate(DEFAULT_DOCUMENT_TEMPLATES[DocumentType.COMPLAINT], {
      NOMOR_PERKARA: '123/Pdt.G/2026/PN Jkt.Pst',
      PENGADILAN: 'PN Jakarta Pusat',
    });

    expect(result).toContain('123/Pdt.G/2026/PN Jkt.Pst');
    expect(result).toContain('PN Jakarta Pusat');
    expect(result).toContain('{{POSITA}}');
    expect(result).toContain('\n\n');
    expect(result).not.toContain('\\n');
  });

  it('hashes the exact UTF-8 document text deterministically', () => {
    expect(hashDocumentContent('putusan\nfinal')).toBe(hashDocumentContent('putusan\nfinal'));
    expect(hashDocumentContent('putusan\nfinal')).not.toBe(hashDocumentContent('putusan revisi'));
  });
});
