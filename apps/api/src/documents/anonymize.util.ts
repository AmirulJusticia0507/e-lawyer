// Utilitas anonimisasi untuk publikasi putusan/dokumen secara publik.
// Mendeteksi dan menyamarkan identifier pribadi (NIK, NPWP, telepon, email)
// supaya data pribadi (PII) tidak bocor ketika dokumen dipublikasikan.
// Catatan: anonimisasi nama pihak memerlukan NER/peninjauan manual; util ini
// menyediakan penanda awal dan disarankan dipasangkan dengan review manual.

export interface AnonymizeResult {
  anonymized: string;
  counts: {
    nik: number;
    npwp: number;
    phone: number;
    email: number;
  };
}

const PII_PATTERNS: Array<{ regex: RegExp; placeholder: string; key: keyof AnonymizeResult['counts'] }> = [
  // NIK (16 digit berturut-turut)
  { regex: /\b\d{16}\b/g, placeholder: '[NIK–ANON]', key: 'nik' },
  // NPWP (xxx.xxx.xxx.x-xxx.xxx)
  { regex: /\b\d{2}\.\d{3}\.\d{3}\.\d-\d{3}\.\d{3}\b/g, placeholder: '[NPWP–ANON]', key: 'npwp' },
  // Telepon Indonesia (08/62, 9-13 digit)
  { regex: /\b(?:\+62|62|0)8\d{7,11}\b/g, placeholder: '[TELEPON–ANON]', key: 'phone' },
  // Email
  { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, placeholder: '[EMAIL–ANON]', key: 'email' },
];

export function anonymizeText(input: string): AnonymizeResult {
  let text = input ?? '';
  const counts: AnonymizeResult['counts'] = { nik: 0, npwp: 0, phone: 0, email: 0 };

  for (const { regex, placeholder, key } of PII_PATTERNS) {
    // Regexes are global; reset lastIndex
    regex.lastIndex = 0;
    text = text.replace(regex, () => {
      counts[key] += 1;
      return placeholder;
    });
  }

  const header = '[DOKUMEN DIPUBLIKASIKAN SECARA ANONIM — IDENTITAS PIHAK DISAMARKAN]\n\n';
  return { anonymized: header + text, counts };
}