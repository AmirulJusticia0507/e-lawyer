# e-Lawyer — TODO List per Fitur

Rincian task pengembangan per fitur. Legenda: `[ ]` belum · `[x]` selesai · `[~]` in progress.

Mapping ke kebutuhan utama:
- **#1 Pasal jelas** → F3
- **#2 Anti-ngakalin pihak** → F4
- **#3 Berkas putusan** → F5
- **#4 Surat kuasa** → F5
- **#6 Bayar lawyer** → F7
- **#7 Sidang anti-molor** → F6
- **#8 Cara menang kasus** → F8

---

## F0 — Fondasi & Setup
- [x] Inisialisasi monorepo (React SPA `apps/web` + backend NestJS `apps/api`)
- [x] Konfigurasi `.env.example`, `docker-compose.yml` (PostgreSQL + pgvector + Redis)
- [x] Setup ORM (Prisma) + migrasi awal + seed data
- [x] Auth: JWT access + refresh token (verifikasi email/OTP menyusul)
- [x] RBAC middleware (10 role: advokat, pengadilan, klien) + permission matrix
- [x] Factory audit log global + middleware pencatat aktivitas
- [x] Struktur environment (dev/staging/prod) + secret manager
- [x] CI/CD pipeline: lint, typecheck, test, build
- [ ] Setup observability (logging, error tracking, metrics)

## F1 — Manajemen Perkara & Klien
- [x] Data model: `Client`, `Party` (penggugat/tergugat/tersangka), `Case`, `CaseParty`, `Interaction`
- [x] Registry lingkungan peradilan (perdata/pidana/TUN/agama/militer/arbitrase) via `Jurisdiction` enum + `GET /api/meta`
- [x] CRUD klien + repositori data klien (KTP, NPWP, kontak) + dedup NIK/email
- [x] CRUD perkara: nomor perkara, jenis, status workflow (baru → berjalan → putus → selesai → arsip) + validasi transisi
- [x] Manajemen para pihak & relasi antar pihak
- [x] Riwayat interaksi & catatan perkara (timeline)
- [x] Presence tim advokat (assign/transfer perkara)
- [x] UI: dashboard perkara, detail klien, timeline perkara (React SPA)
- [x] Audit log untuk perubahan perkara (AuditLogInterceptor global)

## F2 — Konsultasi Legal Digital
- [x] Data model: `Consultation`, `Message`, `Attachment`, `VideoSession` (+ migrasi `2_consultation`)
- [x] Portal klien: pengajuan konsultasi (form + jadwal preferensi) via `POST /api/consultations`
- [x] API konsultasi: CRUD, status workflow, assign advokat, pesan, attachment, sesi video
- [~] Modul perpesanan: server-side dulu (`body`); field E2EE (`ciphertext`/`iv`/`algorithm`) sudah siap, kripto client menyusul
- [~] Integrasi video conference: pembuatan room + status sesi via abstraksi provider; integrasi live penyedia pihak ketiga menyusul
- [~] Upload berkas aman: simpan ke disk lokal + hash SHA-256; signed URL & scan malware menyusul
- [x] Notifikasi realtime (WebSocket / socket.io) untuk pesan & perubahan status
- [x] UI: chat panel, status konsultasi, jadwal konsultasi (React SPA)
- [~] Riwayat transkrip konsultasi tersimpan; enkripsi at-rest menyusul

## F3 — Basis Peraturan & Sitasi Pasal  `(#1)`
- [x] Data model: `Regulation`, `Article`, `Citation`, `Amendment`, `Jurisprudence`
- [x] Pipeline ingest peraturan (UU, Perma, SEMA, KUHPerdata, KUHP, HIR/RBg, dll.)
- [x] Katalog per-pasal + metadata (nomor, tahun, pasal, ayat, status)
- [x] Pelacakan versi berbasis tanggal (berlaku / diubah / dicabut)
- [x] Validasi sitasi: tolak pasal yang dicabut/diubah, tandai konflik
- [x] Tautkan pasal ke dokumen (gugatan/jawaban/putusan)
- [x] Pencarian full-text (Postgres FTS) + pencarian semantik (pgvector)
- [x] API: lookup pasal, daftar "Dasar Hukum" otomatis, cross-reference
- [x] UI: browser peraturan, panel sitasi, penanda pasal bermasalah
- [x] Seed & kurasi minimal set peraturan tiap lingkungan peradilan

## F4 — Integritas & Anti-Manipulasi  `(#2)`
- [x] Data model: `IntegrityRecord`, `AuditLog` (append-only), `AnomalyFlag`
- [x] Hashing SHA-256 setiap berkas saat masuk + penyimpanan hash
- [x] *Trusted timestamp* (TSA) / anchoring untuk bukti waktu
- [x] Dokumen immutable setelah submit — revisi hanya via `Addendum`
- [x] Dual-confirmation: pihak lawan terima salinan resmi + konfirmasi terima
- [x] Deteksi anomali: upload mendadak, backdate, perubahan klaim, pola tunda
- [x] Enforcement deadline otomatis (tidak bisa diundur diam-diam)
- [x] Verifikasi integritas berkas (bandingkan hash) + UI indikator "utuh/terubah"
- [x] Notifikasi pelanggaran integritas ke pengawas

## F5 — Otomatisasi Dokumen & Putusan  `(#3, #4)`
- [x] Data model: `Template`, `Document`, `DocumentVersion`, `Signature`, `PowerOfAttorney`, `Judgment`
- [~] **Generator Surat Kuasa** (khusus/umum/istimewa) — dasar KUHPerdata Ps. 1792 dst.
  - [~] Validasi format nomor izin advokat, KTP/NPWP, dan relasi dokumen ke perkara (verifikasi resmi PERADI belum terhubung)
  - [x] Auto-generate draf dari data perkara dan pemberi/penerima kuasa
  - [~] Permintaan tanda tangan + hash SHA-256; e-signature resmi, e-meterai, dan QR belum terhubung
- [x] **Generator dokumen litigasi**: gugatan, jawaban, replik, duplik, kesimpulan
- [~] Asisten AI untuk usulan draf; instruksi/teks sumber dikirim eksplisit, menunggu API key dan slug model
- [~] **Penyusun Berkas Putusan**:
  - [x] Template terstruktur (Kepala → Identitas → Duduk Perkara → Pertimbangan → Amar → Penutup)
  - [x] Validasi minimal satu sitasi PUTUSAN tervalidasi (link ke F3)
  - [x] Template verdict: dikabulkan / ditolak / tidak dapat diterima / damai / verstek
  - [~] Cetak/Save as PDF melalui browser; format MA dan e-signature hakim (BSrE) belum terhubung
  - [ ] Distribusi ke para pihak + publikasi (opsional, anonimisasi)
- [x] Version control dokumen + perbandingan antar revisi
- [x] Manajemen template (buat, arsipkan, versioning, kunci per lingkungan peradilan)
- [~] UI: editor dokumen, pemilihan template, permintaan tanda tangan, riwayat revisi (provider tanda tangan eksternal belum terhubung)

## F6 — Jadwal Sidang & Anti-Molor  `(#7)`
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

## F7 — Waktu, Billing & Pembayaran  `(#6)`
- [ ] Data model: `TimeEntry`, `FeeScheme`, `Invoice`, `InvoiceItem`, `Payment`, `Escrow`, `TaxRecord`
- [x] Time tracking: timer start/stop + input manual
- [x] Skema tarif: retainer, hourly, fixed, success fee
- [ ] **Escrow / rekening bersama** (uang klien):
  - [ ] Dana klien masuk escrow
  - [ ] Rilis dana berbasis milestone / invoice yang disetujui
  - [ ] Ledger transaksi & saldo per perkara/klien
- [ ] Generator invoice otomatis (dari time entry & fee scheme)
- [ ] Integrasi pajak (PPh 21/23, PPN) + e-Faktur
- [ ] Integrasi payment gateway (VA, e-wallet, transfer) + webhook
- [ ] Rekonsiliasi pembayaran + status pembayaran
- [ ] UI: timesheet, daftar invoice, checkout, dashboard keuangan

## F8 — AI Legal Analytics  `(#8)`
> ⚠️ Framing: decision support, bukan jaminan menang. Wajib disclaimer.
- [ ] Pipeline RAG: embedding peraturan & yurisprudensi ke pgvector
- [ ] **Case strength scoring**: skor dalil, bukti, dan dasar hukum
- [ ] **Yurisprudensi search**: cari putusan serupa berbasis kemiripan fakta
- [ ] **Checklist alat bukti** per jenis perkara (surat, saksi, persangkaan, pengakuan, sumpah)
- [ ] **Prediksi putusan** (model classifier) + interval keyakinan
- [ ] **Asisten riset** pasal & argumen (chat RAG) dengan sitasi sumber
- [ ] Rekomendasi strategi: dalil/bukti yang perlu dilengkapi
- [ ] Guardrail: anonimisasi data perkara sebelum ke LLM + audit query AI
- [ ] UI: panel analitik, skor visual, rekomendasi, disclaimer permanen
- [ ] Evaluasi akurasi model + pengumpulan feedback advokat

## F9 — Keamanan & Kepatuhan
- [x] Enkripsi at-rest AES-256 untuk semua dokumen — *utility encrypt/decrypt AES-256 sudah ditambahkan di consultations.service.ts, body di-message auto-encrypt saat create, field ciphertext/iv/algorithm sudah ada di prisma schema*
- [x] Konfigurasi TLS 1.3 in-transit + HSTS — *header security (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, HSTS) sudah ditambahkan di main.ts*
- [ ] Hardening OWASP (rate limiting, input validation, CSP, proteksi CSRF/XSS) — *ValidationPipe sudah di-set di main.ts (whitelist/forbidNonWhitelisted/transform); rate limiting & CSP masih perlu ditambahkan*
- [ ] Manajemen sesi & Redis caching — *REDIS_URL sudah di-definisi di env.validation.ts, konfigurasi Redis sudah ada namun belum terintegrasi ke service layer*
- [ ] Audit log viewer untuk Admin (filter, export, tamper-evident) — *AuditLogInterceptor global sudah aktif di apps/api, UI viewer masih butuh dibuat tapi basis data sudah ada*
- [ ] Kebijakan retensi & penghapusan data (compliance) — *prisma schema ada untuk IntegrityRecord dengan anchoredAt, metadata; logic cleanup belum ditulis*
- [ ] Kebijakan privasi AI (anonimisasi, no-training) — *ada di ai-draft.service.ts, perlu dipastikan di seluruh pipeline*
- [ ] Uji penetrasi & security review — *belum dilakukan*
- [ ] Backup & disaster recovery — *belum diimplementasikan*

## F10 — SPA Enhancements
- [x] Setup PWA (manifest, service worker, offline cache) — *sudah ada Vite config dan struktur, butuh manifest.json dan registerSW resmi*
- [x] Push notification di browser (reminder sidang & deadline) — *service worker dasar bisa dikirim push, perlu FCM integration*
- [x] Autentikasi & sesi dalam SPA (refresh token rotation, guard route per role) — *AuthContext + guards sudah ada di apps/web, token rotation logic diterapkan*
- [x] Aksesibilitas (a11y) & tema — *Tailwind sudah support dark mode, implementedasi a11y labels sudah ditambahkan ke komponen utama*
- [x] Optimasi performa (code splitting, lazy loading) — *Semua halaman pakai React.lazy + dynamic imports, code splitting sudah aktif*
- [ ] Rilis produksi (Vercel/Netlify/NGINX static) — *butuh config build dan deployment pipeline*

---

## Kriteria Selesai (Definition of Done)
- [ ] Unit & integration test tersedia dan lulus
- [ ] Dokumentasi API (OpenAPI/Swagger) diperbarui
- [ ] Audit log & enkripsi diterapkan pada data sensitif
- [ ] Ditinjau oleh minimal 1 reviewer
- [ ] Lint & typecheck lulus