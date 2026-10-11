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
- [ ] Struktur environment (dev/staging/prod) + secret manager
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
- [ ] Data model: `Consultation`, `Message`, `Attachment`, `VideoSession`
- [ ] Portal klien: pengajuan konsultasi (form + jadwal preferensi)
- [ ] Modul perpesanan E2EE (end-to-end encryption)
- [ ] Integrasi video conference (WebRTC / penyedia pihak ketiga)
- [ ] Upload + verifikasi berkas aman (signed URL, scan malware, hash)
- [ ] Notifikasi realtime (WebSocket / push)
- [ ] UI: chat panel, status konsultasi, jadwal konsultasi
- [ ] Riwayat & transkrip konsultasi (terenkripsi)

## F3 — Basis Peraturan & Sitasi Pasal  `(#1)`
- [ ] Data model: `Regulation`, `Article`, `Citation`, `Amendment`, `Jurisprudence`
- [ ] Pipeline ingest peraturan (UU, Perma, SEMA, KUHPerdata, KUHP, HIR/RBg, dll.)
- [ ] Katalog per-pasal + metadata (nomor, tahun, pasal, ayat, status)
- [ ] Pelacakan versi berbasis tanggal (berlaku / diubah / dicabut)
- [ ] Validasi sitasi: tolak pasal yang dicabut/diubah, tandai konflik
- [ ] Tautkan pasal ke dokumen (gugatan/jawaban/putusan)
- [ ] Pencarian full-text (Postgres FTS/Elasticsearch) + pencarian semantik (pgvector)
- [ ] API: lookup pasal, daftar "Dasar Hukum" otomatis, cross-reference
- [ ] UI: browser peraturan, panel sitasi, penanda pasal bermasalah
- [ ] Seed & kurasi minimal set peraturan tiap lingkungan peradilan

## F4 — Integritas & Anti-Manipulasi  `(#2)`
- [ ] Data model: `IntegrityRecord`, `AuditLog` (append-only), `AnomalyFlag`
- [ ] Hashing SHA-256 setiap berkas saat masuk + penyimpanan hash
- [ ] *Trusted timestamp* (TSA) / anchoring untuk bukti waktu
- [ ] Dokumen immutable setelah submit — revisi hanya via `Addendum`
- [ ] Dual-confirmation: pihak lawan terima salinan resmi + konfirmasi terima
- [ ] Deteksi anomali: upload mendadak, backdate, perubahan klaim, pola tunda
- [ ] Enforcement deadline otomatis (tidak bisa diundur diam-diam)
- [ ] Verifikasi integritas berkas (bandingkan hash) + UI indikator "utuh/terubah"
- [ ] Notifikasi pelanggaran integritas ke pengawas

## F5 — Otomatisasi Dokumen & Putusan  `(#3, #4)`
- [ ] Data model: `Template`, `Document`, `DocumentVersion`, `Signature`, `PowerOfAttorney`, `Judgment`
- [ ] **Generator Surat Kuasa** (khusus/umum/istimewa) — dasar KUHPerdata Ps. 1792 dst.
  - [ ] Validasi nomor izin advokat (PERADI), KTP/NPWP, relasi ke perkara
  - [ ] Auto-generate dari data klien & perkara
  - [ ] E-signature + e-meterai + verifikasi keaslian (QR/hash)
- [ ] **Generator dokumen litigasi**: gugatan, jawaban, replik, duplik, kesimpulan
- [ ] **Penyusun Berkas Putusan**:
  - [ ] Template terstruktur (Kepala → Identitas → Duduk Perkara → Pertimbangan → Amar → Penutup)
  - [ ] Validasi wajib sitasi pasal pada bagian pertimbangan hukum (link ke F3)
  - [ ] Template verdict: dikabulkan / ditolak / tidak dapat diterima / damai / verstek
  - [ ] Export PDF format MA + e-signature hakim (BSrE)
  - [ ] Distribusi ke para pihak + publikasi (opsional, anonimisasi)
- [ ] Version control dokumen + diff antar revisi
- [ ] Manajemen template (CRUD, versioning, kunci per lingkungan peradilan)
- [ ] UI: editor dokumen, pemilihan template, alur tanda tangan, riwayat revisi

## F6 — Jadwal Sidang & Anti-Molor  `(#7)`
- [ ] Data model: `Hearing`, `Courtroom`, `JudgeSchedule`, `Postponement`, `Reminder`
- [ ] Kalender sidang terpusat (sinkron jadwal hakim + ruang sidang)
- [ ] Deteksi bentrok jadwal (hakim, ruang, para pihak) otomatis
- [ ] **Limit penundaan** sidang: hitung & batasi sesuai aturan pembatasan penundaan
- [ ] Alur permohonan penundaan + persetujuan hakim + jejak alasan
- [ ] Reminder otomatis H-7 / H-3 / H-1 (email, WhatsApp, push)
- [ ] SLA timer per tahapan persidangan + alert saat mendekati/melewati batas
- [ ] Escalation ke pengawas jika sidang molor tanpa alasan sah
- [ ] Dashboard statistik keterlambatan per hakim/perkara
- [ ] UI: kalender interaktif, drag-and-drop penjadwalan (dengan validasi)

## F7 — Waktu, Billing & Pembayaran  `(#6)`
- [ ] Data model: `TimeEntry`, `FeeScheme`, `Invoice`, `InvoiceItem`, `Payment`, `Escrow`, `TaxRecord`
- [ ] Time tracking: timer start/stop + input manual
- [ ] Skema tarif: retainer, hourly, fixed, success fee
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
- [ ] Enkripsi at-rest AES-256 untuk semua dokumen
- [ ] Konfigurasi TLS 1.3 in-transit + HSTS
- [ ] Hardening OWASP (rate limiting, input validation, CSP, proteksi CSRF/XSS)
- [ ] Manajemen sesi & Redis caching
- [ ] Audit log viewer untuk Admin (filter, export, tamper-evident)
- [ ] Kebijakan retensi & penghapusan data (compliance)
- [ ] Kebijakan privasi AI (anonimisasi, no-training)
- [ ] Uji penetrasi & security review
- [ ] Backup & disaster recovery

## F10 — SPA Enhancements
- [ ] Setup PWA (manifest, service worker, offline cache)
- [ ] Push notification di browser (reminder sidang & deadline)
- [ ] Autentikasi & sesi dalam SPA (refresh token rotation, guard route per role)
- [ ] Aksesibilitas (a11y) & tema
- [ ] Optimasi performa (code splitting, lazy loading)
- [ ] Rilis produksi (Vercel/Netlify/NGINX static)

---

## Kriteria Selesai (Definition of Done)
- [ ] Unit & integration test tersedia dan lulus
- [ ] Dokumentasi API (OpenAPI/Swagger) diperbarui
- [ ] Audit log & enkripsi diterapkan pada data sensitif
- [ ] Ditinjau oleh minimal 1 reviewer
- [ ] Lint & typecheck lulus
