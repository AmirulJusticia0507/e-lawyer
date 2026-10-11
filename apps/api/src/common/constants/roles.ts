export enum RoleName {
  // Sisi advokat / firma hukum
  ADMIN = 'ADMIN',
  MANAGING_PARTNER = 'MANAGING_PARTNER',
  SENIOR_ASSOCIATE = 'SENIOR_ASSOCIATE',
  JUNIOR_ASSOCIATE = 'JUNIOR_ASSOCIATE',
  PARALEGAL = 'PARALEGAL',
  CLIENT = 'CLIENT',
  // Sisi pengadilan
  JUDGE = 'JUDGE',
  CLERK = 'CLERK',
  BAILIFF = 'BAILIFF',
  PROSECUTOR = 'PROSECUTOR',
}

export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  [RoleName.ADMIN]: 'Administrator sistem: kelola pengguna, role, dan audit log',
  [RoleName.MANAGING_PARTNER]: 'Managing partner: overview firma dan seluruh perkara',
  [RoleName.SENIOR_ASSOCIATE]: 'Senior associate: kelola perkara, dokumen, billing tim',
  [RoleName.JUNIOR_ASSOCIATE]: 'Junior associate: perkara yang ditugaskan dan dokumen',
  [RoleName.PARALEGAL]: 'Paralegal: dukungan perkara, dokumen, dan jadwal',
  [RoleName.CLIENT]: 'Klien: portal konsultasi, berkas, status perkara, invoice',
  [RoleName.JUDGE]: 'Hakim: menyusun dan menandatangani putusan',
  [RoleName.CLERK]: 'Panitera: administrasi perkara dan jadwal sidang',
  [RoleName.BAILIFF]: 'Juru sita: pemanggilan dan pemberitahuan resmi',
  [RoleName.PROSECUTOR]: 'Jaksa penuntut umum: dakwaan dan tuntutan (pidana)',
};

export const DEFAULT_ROLE = RoleName.CLIENT;
