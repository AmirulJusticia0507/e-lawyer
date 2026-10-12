import { createHash } from 'crypto';
import { DocumentType } from '@prisma/client';

export const DEFAULT_DOCUMENT_TEMPLATES: Record<DocumentType, string> = {
  POWER_OF_ATTORNEY:
    'SURAT KUASA {{JENIS_KUASA}}\\n\\nYang bertanda tangan di bawah ini, {{NAMA_PEMBERI}}, NIK {{NIK_PEMBERI}}, memberikan kuasa kepada {{NAMA_PENERIMA}}, pemegang izin advokat {{NOMOR_IZIN}}, untuk {{KEWENANGAN}}.\\n\\nSehubungan dengan perkara {{NOMOR_PERKARA}} di {{PENGADILAN}}.\\n\\n{{KOTA}}, {{TANGGAL}}\\nPemberi kuasa,\\n\\n{{NAMA_PEMBERI}}',
  COMPLAINT:
    'GUGATAN\\n\\nKepada Yth. {{PENGADILAN}}\\nPerihal: {{JUDUL_PERKARA}}\\nNomor perkara: {{NOMOR_PERKARA}}\\n\\nI. PARA PIHAK\\n{{PARA_PIHAK}}\\n\\nII. POSITA\\n{{POSITA}}\\n\\nIII. PETITUM\\n{{PETITUM}}\\n\\nDibuat pada {{TANGGAL}}.',
  ANSWER:
    'JAWABAN TERGUGAT\\n\\nPerkara {{NOMOR_PERKARA}} — {{JUDUL_PERKARA}}\\n\\nI. EKSEPSI\\n{{EKSEPSI}}\\n\\nII. JAWABAN POKOK PERKARA\\n{{JAWABAN}}\\n\\nIII. PETITUM\\n{{PETITUM}}',
  REPLY:
    'REPLIK PENGGUGAT\\n\\nPerkara {{NOMOR_PERKARA}}\\n\\nTanggapan atas jawaban: {{TANGGAPAN}}\\n\\nPetitum: {{PETITUM}}',
  DUPLICATION:
    'DUPLIK TERGUGAT\\n\\nPerkara {{NOMOR_PERKARA}}\\n\\nTanggapan atas replik: {{TANGGAPAN}}\\n\\nPetitum: {{PETITUM}}',
  CONCLUSION:
    'KESIMPULAN\\n\\nPerkara {{NOMOR_PERKARA}} — {{JUDUL_PERKARA}}\\n\\nFakta persidangan: {{FAKTA}}\\nAnalisis hukum: {{ANALISIS}}\\nDasar hukum: {{DASAR_HUKUM}}\\nKesimpulan dan permohonan: {{PERMOHONAN}}',
  JUDGMENT:
    'PUTUSAN\\n\\n{{KEPALA}}\\n\\nIDENTITAS PARA PIHAK\\n{{IDENTITAS}}\\n\\nDUDUK PERKARA\\n{{DUDUK_PERKARA}}\\n\\nPERTIMBANGAN HUKUM\\n{{PERTIMBANGAN}}\\n\\nAMAR PUTUSAN\\n{{AMAR}}\\n\\nPENUTUP\\n{{PENUTUP}}',
  OTHER: '{{ISI_DOKUMEN}}',
};

export function renderDocumentTemplate(template: string, values: Record<string, string>): string {
  return template
    .replace(/\{\{([A-Z0-9_]+)\}\}/g, (placeholder, key: string) =>
      Object.prototype.hasOwnProperty.call(values, key) ? values[key] : placeholder,
    )
    .replace(/\\n/g, '\n');
}

export function hashDocumentContent(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}
