## F3 �?" Basis Peraturan & Sitasi Pasal  $(#1)
- [x] Inisialisasi monorepo (React SPA `apps/web` + backend NestJS `apps/api`)
- [x] Konfigurasi `.env.example`, `docker-compose.yml` (PostgreSQL + pgvector + Redis)
- [x] Setup ORM (Prisma) + migrasi awal + seed data
- [x] Auth: JWT access + refresh token (verifikasi email/OTP menyusul)
- [x] RBAC middleware (10 role: advokat, pengadilan, klien) + permission matrix
- [x] Factory audit log global + middleware pencatat aktivitas
- [x] Struktur environment (dev/staging/prod) + secret manager
- [x] CI/CD pipeline: lint, typecheck, test, build
- [ ] Setup observability (logging, error tracking, metrics)
- [x] Data model: `Regulation`, `Article`, `Citation`, `Amendment`, `Jurisprudence`
- [x] Pipeline ingest peraturan (Uu, Perma, SEMA, KUHPerdata, KUHP, HIR/RBg, dll.)
- [x] Katalog per-pasal + metadata (nomor, tahun, pasal, ayat, status)
- [x] Pelacakan versi berbasis tanggal (berlaku / diubah / dicabut)
- [x] Validasi sitasi: tolak pasal yang dicabut/diubah, tandai konflik
- [x] Tautkan pasal ke dokumen (gugatan/jawaban/putusan)
- [x] Pencarian full-text (Postgres FTS) + pencarian semantik (pgvector)
- [x] API: lookup pasal, daftar "Dasar Hukum" otomatis, cross-reference
- [x] UI: browser peraturan, panel sitasi, penanda pasal bermasalah
- [x] Seed & kurasi minimal set peraturan tiap lingkungan peradilan
- [x] F4 - Integritas & Anti-Manipulasi  $(#2)
- [x] Data model: `IntegrityRecord`, `AuditLog` (append-only), `AnomalyFlag`
- [x] Hashing SHA-256 setiap berkas saat masuk + penyimpanan hash
- [x] *Trusted timestamp* (TSA) / anchoring untuk bukti waktu
- [x] Dokumen immutable setelah submit �?" revisi hanya via `Addendum`
- [x] Dual-confirmation: pihak lawan terima salinan resmi + konfirmasi terima
- [x] Deteksi anomali: upload mendadak, backdate, perubahan klaim, pola tunda
- [x] Enforcement deadline otomatis (tidak bisa diundur diam-diam)
- [x] Verifikasi integritas berkas (bandingkan hash) + UI indikator "utuh/terubah"
- [x] Notifikasi pelanggaran integritas ke pengawas
- [x] Data model: `Template`, `Document`, `DocumentVersion`, `Signature`, `PowerOfAttorney`, `Judgment`
- [~] **Generator Surat Kuasa** (khusus/umum/istimewa) �?" dasar KUHPerdata Ps. 1792 dst.
  - [~] Validasi format nomor izin advokat, KTP/NPWP, dan relasi dokumen ke perkara (verifikasi resmi PERADI belum terhubung)
  - [x] Auto-generate draf dari data perkara dan pemberi/penerima kuasa
  - [~] Permintaan tanda tangan + hash SHA-256; e-signature resmi, e-meterai, dan QR belum terhubung
- [x] **Generator dokumen litigasi**: gugatan, jawaban, replik, duplik, kesimpulan
- [~] Asisten AI untuk usulan draf; instruksi/teks sumber dikirim eksplisit, menunggu API key dan slug model
- [~] **Penyusun Berkas Putusan**:
  - [x] Template terstruktur (Kepala �+' Identitas �+' Duduk Perkara �+' Pertimbangan �+' Amar �+' Penutup)
  - [x] Validasi minimal satu sitasi PUTUSAN tervalidasi (link ke F3)
  - [x] Template verdict: dikabulkan / ditolak / tidak dapat diterima / damai / verstek
  - [~] Cetak/Save as PDF melalui browser; format MA dan e-signature hakim (BSrE) belum terhubung
  - [ ] Distribusi ke para pihak + publikasi (opsional, anonimisasi)
- [x] Version control dokumen + perbandingan antar revisi
- [x] Manajemen template (buat, arsipkan, versioning, kunci per lingkungan peradilan)
- [~] UI: editor dokumen, pemilihan template, permintaan tanda tangan, riwayat revisi (provider tanda tangan eksternal belum terhubung)
- [x] Data model `Hearing` dasar (migration `20261012052909_f6_hearing_schedule`, belum di-commit)
- [x] API: `GET /hearings` (filter from/to/caseId) + `POST /hearings` dengan validasi bentrok
- [x] Deteksi bentrok ruang sidang, hakim, dan pihak yang sama pada jadwal baru (dengan unit test)
- [x] UI: form tambah sidang + agenda 7 hari dasar di `apps/web/src/pages/Hearings.tsx`
- [x] Data model lanjutan: `Courtroom`, `JudgeSchedule`, `Postponement`, `Reminder`
- [ ] Sinkronisasi kalender terpusat (export ICS / integrasi Google/Outlook)
- [x] **Limit penundaan** sidang: hitung & batasi sesuai aturan pembatasan penundaan
- [x] **Alur permohonan penundaan + persetujuan hakim + jejak alasan** - SELESAI
- [x] Reminder otomatis H-7 / H-3 / H-1 (email, WhatsApp, push)
- [x] SLA timer per tahapan persidangan + alert saat mendekati/melewati batas
- [x] Escalation ke pengawas jika sidang molor tanpa alasan sah
- [x] Dashboard statistik keterlambatan per hakim/perkara
- [x] UI: kalender interaktif / drag-and-drop (grid waktu)

## F4 �?" Integritas & Anti-Manipulasi  $(#2)
- [x] Data model: `IntegrityRecord`, `AuditLog` (append-only), `AnomalyFlag`
- [x] Hashing SHA-256 setiap berkas saat masuk + penyimpanan hash
- [x] *Trusted timestamp* (TSA) / anchoring untuk bukti waktu
- [x] Dokumen immutable setelah submit �?" revisi hanya via `Addendum`
- [x] Dual-confirmation: pihak lawan terima salinan resmi + konfirmasi terima
- [x] Deteksi anomali: upload mendadak, backdate, perubahan klaim, pola tunda
- [x] Enforcement deadline otomatis (tidak bisa diundur diam-diam)
- [x] Verifikasi integritas berkas (bandingkan hash) + UI indikator "utuh/terubah"
- [x] Notifikasi pelanggaran integritas ke pengawas

## F5 �?" Otomatisasi Dokumen & Putusan  $(#3, #4)
- [x] Data model: `Template`, `Document`, `DocumentVersion`, `Signature`, `PowerOfAttorney`, `Judgment`
- [~] **Generator Surat Kuasa** (khusus/umum/istimewa) �?" dasar KUHPerdata Ps. 1792 dst.
  - [~] Validasi format nomor izin advokat, KTP/NPWP, dan relasi dokumen ke perkara (verifikasi resmi PERADI belum terhubung)
  - [x] Auto-generate draf dari data perkara dan pemberi/penerima kuasa
  - [~] Permintaan tanda tangan + hash SHA-256; e-signature resmi, e-meterai, dan QR belum terhubung
- [x] **Generator dokumen litigasi**: gugatan, jawaban, replik, duplik, kesimpulan
- [~] Asisten AI untuk usulan draf; instruksi/teks sumber dikirim eksplisit, menunggu API key dan slug model
- [~] **Penyusun Berkas Putusan**:
  - [x] Template terstruktur (Kepala �+' Identitas �+' Duduk Perkara �+' Pertimbangan �+' Amar �+' Penutup)
  - [x] Validasi minimal satu sitasi PUTUSAN tervalidasi (link ke F3)
  - [x] Template verdict: dikabulkan / ditolak / tidak dapat diterima / damai / verstek
  - [~] Cetak/Save as PDF melalui browser; format MA dan e-signature hakim (BSrE) belum terhubung
  - [ ] Distribusi ke para pihak + publikasi (opsional, anonimisasi)
- [x] Version control dokumen + perbandingan antar revisi
- [x] Manajemen template (buat, arsipkan, versioning, kunci per lingkungan peradilan)
- [~] UI: editor dokumen, pemilihan template, permintaan tanda tangan, riwayat revisi (provider tanda tangan eksternal belum terhubung)

## F6 �?" Jadwal Sidang & Anti-Molor  $(#7)
- [x] Data model `Hearing` dasar (migration `20261012052909_f6_hearing_schedule`, belum di-commit)
- [x] API: `GET /hearings` (filter from/to/caseId) + `POST /hearings` dengan validasi bentrok
- [x] Deteksi bentrok ruang sidang, hakim, dan pihak yang sama pada jadwal baru (dengan unit test)
- [x] UI: form tambah sidang + agenda 7 hari dasar di `apps/web/src/pages/Hearings.tsx`
- [x] Data model lanjutan: `Courtroom`, `JudgeSchedule`, `Postponement`, `Reminder`
- [ ] Sinkronisasi kalender terpusat (export ICS / integrasi Google/Outlook)
- [x] **Limit penundaan** sidang: hitung & batasi sesuai aturan pembatasan penundaan
- [x] **Alur permohonan penundaan + persetujuan hakim + jejak alasan** - SELESAI
- [x] Reminder otomatis H-7 / H-3 / H-1 (email, WhatsApp, push)
- [x] SLA timer per tahapan persidangan + alert saat mendekati/melewati batas
- [x] Escalation ke pengawas jika sidang molor tanpa alasan sah
- [x] Dashboard statistik keterlambatan per hakim/perkara
- [x] UI: kalender interaktif / drag-and-drop (grid waktu)

## F7 �?" Waktu, Billing & Pembayaran  $(#6)
- [ ] Data model: `TimeEntry`, `FeeScheme`, `Invoice`, `InvoiceItem`, `Payment`, `Escrow`, `TaxRecord`
- [x] Time tracking: timer start/stop + input manual
- [x] Skema tarif: retainer, hourly, fixed, success fee
- [ ] **Escrow / rekening bersama** (uang klien):
  - [ ] Dana klien masuk escrow
  - [ ] Rilis dana berbasis milestone / invoice yang disetujui
  - [ ] Ledger transaksi & saldo per perkara/klien
- [ ] Generator invoice otomatis (dari time entry & fee scheme)

## F8 �?" AI Legal Analytics  $(#8)
> ?????? Framing: decision support, bukan jaminan menang. Wajib disclaimer.
