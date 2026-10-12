# e-Lawyer Platform

> Platform *Legal Tech* terpadu yang menghubungkan **advokat/firma hukum** dan **pengadilan** dalam satu ekosistem litigasi digital: manajemen perkara, konsultasi klien, basis peraturan, penyusunan dokumen & putusan, penjadwalan sidang, pembayaran, dan analitik hukum berbasis AI.

[![Status](https://img.shields.io/badge/status-planning-yellow)]()
[![License](https://img.shields.io/badge/license-proprietary-red)]()

> ⚠️ **Disclaimer:** Sistem ini adalah alat bantu (decision support). Output AI **bukan** nasihat hukum resmi dan **tidak menjamin** hasil/kemenangan suatu perkara. Segala keputusan hukum tetap tanggung jawab advokat/hakim.

---

## Daftar Isi

- [Tentang](#tentang)
- [Cakupan Yurisdiksi](#cakupan-yurisdiksi)
- [Fitur Utama](#fitur-utama)
- [Arsitektur & Teknologi](#arsitektur--teknologi)
- [Peran Pengguna (RBAC)](#peran-pengguna-rbac)
- [Alur Sistem](#alur-sistem)
- [Panduan Instalasi](#panduan-instalasi)
- [Konfigurasi Environment](#konfigurasi-environment)
- [Struktur Proyek](#struktur-proyek)
- [Keamanan & Kepatuhan](#keamanan--kepatuhan)
- [Roadmap](#roadmap)
- [Kontribusi](#kontribusi)
- [Lisensi](#lisensi)

---

## Tentang

**e-Lawyer** adalah platform *Legal Tech* terpadu yang dirancang untuk merampingkan praktik hukum digital, manajemen kasus, konsultasi klien, otomatisasi dokumen, serta **kolaborasi antara advokat dan pengadilan** dalam satu sistem.

Sistem dibangun untuk:
- Memenuhi standar kerahasiaan **Advokat–Klien** (*Attorney–Client Privilege*).
- Menjaga **integritas proses hukum** (anti-manipulasi dari pihak penggugat maupun tergugat).
- Menyediakan **sitasi pasal yang akurat** dan **penyusunan putusan** yang konsisten.
- Memberi **analitik & prediksi berbasis AI** sebagai penunjang strategi perkara.

---

## Cakupan Yurisdiksi

Platform dirancang untuk **seluruh lingkungan peradilan Indonesia**:

| Lingkungan | Contoh Dasar Hukum |
|-----------|--------------------|
| **Perdata** | KUHPerdata, HIR/RBg, RV |
| **Pidana** | KUHP, KUHAP |
| **TUN** | UU PTUN, Hukum Acara PTUN |
| **Agama** | UU Peradilan Agama, Kompilasi Hukum Islam |
| **Militer** | UU Peradilan Militer |
| **Sengketa lain** | Arbitrase (UU 30/1999), PHI, Niaga |

Setiap perkara ditautkan dengan *registry* lingkungan peradilan untuk memuat set peraturan & template yang tepat.

---

## Fitur Utama

### 1. Manajemen Perkara & Klien (Case & Client Management)
- Pelacakan status perkara lintas lingkungan peradilan (litigasi & non-litigasi).
- Penjadwalan sidang, jadwal konsultasi, dan pengingat *deadline*.
- Manajemen repositori data klien, para pihak, dan riwayat interaksi.

### 2. Konsultasi Legal Digital (Virtual Consultation Portal)
- Portal klien mandiri untuk pengajuan konsultasi online.
- Modul perpesanan terenkripsi dan integrasi *video conference*.
- Portal unggah dan verifikasi berkas perkara secara aman.

### 3. Basis Peraturan & Sitasi Pasal (Legal Citation Engine)
- Katalog UU, Perma, SEMA, dan yurisprudensi (putusan MA) terstruktur **per pasal**.
- Metadata status: **berlaku / diubah / dicabut**, dengan pelacakan versi berbasis tanggal.
- Setiap dokumen (gugatan, jawaban, putusan) **wajib menautkan pasal**; sistem memvalidasi pasal masih berlaku.
- Pencarian full-text + semantik (vektor) atas peraturan & putusan.

### 4. Integritas & Anti-Manipulasi (Integrity Layer)
- Mencegah penggugat/tergugat "mengakali" proses:
  - Hash **SHA-256** + *trusted timestamp* setiap berkas saat masuk.
  - **Audit log append-only** yang tidak dapat dihapus/diedit.
  - Dokumen yang telah disubmit **immutable** — revisi hanya via *addendum*.
  - **Dual-confirmation**: pihak lawan menerima salinan resmi & konfirmasi.
  - Deteksi anomali (upload mendadak, backdate, perubahan klaim).
  - *Deadline enforcement* otomatis (penundaan tidak bisa disembunyikan).

### 5. Otomatisasi & Penyusunan Dokumen (Document & Judgment Automation)
- Generator draf otomatis: **surat kuasa**, gugatan, jawaban, kontrak, perjanjian.
- **Penyusun berkas putusan** terstruktur: Kepala Putusan → Identitas Pihak → Duduk Perkara → Pertimbangan Hukum (wajib sitasi pasal) → Amar → Penutup.
- *Version control* dokumen + riwayat revisi.
- Integrasi **e-Signature** (BSrE) & **e-Meterai** yang sah secara hukum.

### 6. Jadwal Sidang & Anti-Molor (Hearing Scheduler)
- Kalender sidang terpusat (sinkron jadwal hakim + ruang sidang).
- **Limit otomatis penundaan sidang** sesuai aturan pembatasan penundaan.
- Pengingat otomatis (H-7 / H-3 / H-1) via email, WhatsApp, push.
- Deteksi bentrok jadwal + **escalation** ke pengawas jika molor tanpa alasan.
- Dashboard statistik keterlambatan per hakim/perkara + SLA timer.

### 7. Waktu, Billing & Pembayaran Advokat (Time, Billing & Payment)
- Pencatatan jam kerja advokat (*Billable Hours*); tarif retainer/hourly/fixed/success fee.
- **Escrow / rekening bersama** (uang klien) dengan rilis berbasis milestone.
- Pembuatan *invoice* otomatis + integrasi pajak (PPh 21/23, PPN).
- Integrasi *payment gateway* (VA, e-wallet, transfer) & rekonsiliasi.

### 8. Analitik & Prediksi Kasus berbasis AI (AI Legal Analytics)
- **Case strength scoring**: skor kekuatan dalil, bukti, dan dasar hukum.
- **Yurisprudensi search**: putusan MA/serupa berdasarkan kemiripan fakta.
- **Checklist alat bukti** sesuai jenis perkara (surat, saksi, persangkaan, pengakuan, sumpah).
- **Prediksi putusan** (ML) + rekomendasi strategi — *dengan disclaimer wajib*.
- Asisten riset pasal & argumen (RAG atas basis peraturan & putusan).

### 9. Keamanan & Audit Trail
- *End-to-End Encryption* untuk kerahasiaan *Attorney-Client Privilege*.
- Log aktivitas terpusat (unduh/ubah/hapus) yang permanen.

---

## Arsitektur & Teknologi

| Layer | Teknologi |
|-------|-----------|
| **Frontend (SPA)** | React 18 + Vite |
| **Backend** | Node.js (NestJS) atau Python (FastAPI) |
| **Database** | PostgreSQL (+ `pgvector` untuk pencarian semantik) & Redis |
| **Search** | PostgreSQL FTS / Elasticsearch (peraturan & putusan) |
| **AI/ML** | LLM + RAG pipeline, model prediksi (classifier), embedding model |
| **Storage** | Amazon S3 / Google Cloud Storage (dokumen terenkripsi) |
| **Queue/Scheduler** | BullMQ / Celery + Redis (reminder, eskalasi, SLA) |
| **Security** | AES-256 (at-rest), TLS 1.3 (in-transit), OAuth2/JWT, RBAC |
| **Integrasi** | e-Signature BSrE, e-Meterai, Payment Gateway, TSA (trusted timestamp) |

---

## Peran Pengguna (RBAC)

### Sisi Advokat / Firma Hukum
| Peran | Deskripsi Akses |
|-------|-----------------|
| **Admin Sistem** | Konfigurasi sistem, kelola pengguna, RBAC, audit log |
| **Managing Partner** | Overview firma, laporan keuangan, semua perkara |
| **Senior Associate** | Kelola perkara, dokumen, billing tim |
| **Junior Associate** | Perkara yang ditugaskan, dokumen, time tracking |
| **Paralegal** | Dukungan perkara, dokumen, jadwal |
| **Klien** | Portal konsultasi, upload berkas, status perkara, invoice |

### Sisi Pengadilan
| Peran | Deskripsi Akses |
|-------|-----------------|
| **Hakim** | Menyusun & menandatangani putusan, memutus penundaan sidang |
| **Panitera** | Administrasi perkara, jadwal sidang, pemanggilan pihak |
| **Juru Sita** | Pelaksanaan pemanggilan & pemberitahuan resmi |
| **Jaksa Penuntut Umum** | Perkara pidana (dakwaan, tuntutan) |

---

## Alur Sistem

```
Registrasi/Login (OAuth2/JWT)
        │
        ▼
   RBAC menentukan akses fitur (advokat / pengadilan / klien)
        │
 ┌────────────┬─────────────┬─────────────┬──────────────┐
 │ Perkara &  │ Konsultasi  │ Dokumen &   │ Jadwal       │
 │ Klien      │ Digital     │ Putusan     │ Sidang       │
 └─────┬──────┴──────┬──────┴──────┬──────┴──────┬───────┘
       ▼             ▼             ▼             ▼
 Sitasi Pasal   Chat/Video    Surat Kuasa   Reminder +
 & Validasi     + Berkas      E-Signature   Limit Tunda
       │             │             │             │
       └─────────────┴──────┬──────┴─────────────┘
                            ▼
           Integritas & Audit Trail + Enkripsi AES-256
                            ▼
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
  Billing & Escrow                      AI Legal Analytics
  (pembayaran advokat)                  (skor & prediksi kasus)
                            ▼
                 Storage Terenkripsi (S3/GCS)
```

**Alur bisnis end-to-end:**

1. **Onboarding** — Admin/advokat mengundang klien; klien membuat akun.
2. **Konsultasi** — Klien submit via portal → advokat review → penjadwalan → chat/video → berkas diverifikasi.
3. **Pembukaan Perkara** — Perkara dibuat + assign advokat → sitasi pasal divalidasi → jadwal sidang dibuat.
4. **Persidangan** — Jadwal anti-molor + pengingat → penundaan dibatasi & dilacak → integritas berkas terjaga.
5. **Dokumen & Putusan** — Generate surat kuasa/gugatan → pertimbangan wajib sitasi pasal → putusan + e-signature.
6. **Pembayaran** — Time tracking → invoice otomatis → dana dirilis dari escrow → rekonsiliasi & pajak.
7. **Analitik** — AI menghitung kekuatan kasus, mencari yurisprudensi, dan memberi rekomendasi strategi.
8. **Audit** — Setiap unduh/ubah/hapus berkas tercatat permanen.

---

## Panduan Instalasi

### Prasyarat

- Node.js versi 18.x atau lebih baru
- PostgreSQL versi 14.x atau lebih baru (dengan ekstensi `pgvector`)
- Redis (session, cache, queue)
- Docker & Docker Compose (opsional)

### Langkah-Langkah

1. **Klon Repositori:**
   ```bash
   git clone https://github.com/organization/e-lawyer-system.git
   cd e-lawyer-system
   ```

2. **Pengaturan Environment Variables:**
   ```bash
   cp .env.example .env
   ```

3. **Instalasi Dependensi:**
   ```bash
   npm install
   ```

4. **Migrasi Database:**
   ```bash
   npm run prisma:migrate
   ```

5. **Jalankan Aplikasi:**
   ```bash
   npm run dev
   ```

### Ingest Basis Peraturan

Dataset JSON mengikuti contoh `data/legal-sources/example.json`. Validasi tanpa
menulis database dan proses ingest dapat dijalankan dengan:

```bash
npm run legal:ingest --workspace=@elawyer/api -- --file data/legal-sources/example.json --dry-run
npm run legal:ingest --workspace=@elawyer/api -- --file data/legal-sources/example.json
```

Pipeline bersifat idempotent berdasarkan `slug` peraturan dan `unitKey` pasal.
Seluruh perubahan dalam satu dataset dijalankan dalam satu transaksi.

### API Basis Peraturan

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| GET | `/api/regulations` | Katalog peraturan (filter `type`, `status`, `jurisdiction`, `year`, `search`, `at`) |
| GET | `/api/regulations/:slug` | Detail peraturan + riwayat versi (`at` = tanggal acuan) |
| GET | `/api/regulations/:slug/articles` | Katalog pasal sebuah peraturan |
| GET | `/api/articles` | Katalog pasal lintas peraturan |
| GET | `/api/articles/lookup` | Lookup pasal via `regulationSlug` + `articleNumber` (+`paragraphNumber`, `at`) |
| GET | `/api/articles/:id` | Detail pasal + linimasa versi |

Setiap respons menyertakan `applicability` (`Berlaku`, `Belum Berlaku`,
`Berakhir Berlaku`, `Dicabut`, `Rancangan`, `Status Tidak Diketahui`) dan
`statusAt` yang dihitung dari periode berlaku beserta amendment yang sudah
berlaku pada tanggal acuan.

### API Sitasi Pasal

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| POST | `/api/cases/:caseId/citations` | Tambah sitasi + validasi otomatis (ditolak bila pasal dicabut) |
| GET | `/api/cases/:caseId/citations` | Daftar sitasi perkara + ringkasan status |
| GET | `/api/cases/:caseId/legal-basis` | Daftar "Dasar Hukum" otomatis per peraturan + penanda bermasalah |
| POST | `/api/cases/:caseId/citations/revalidate` | Validasi ulang setelah kurasi peraturan diperbarui |
| DELETE | `/api/cases/:caseId/citations/:citationId` | Hapus sitasi |
| GET | `/api/articles/:articleId/cross-reference` | Cross-reference pasal (amendment, peraturan terkait, perkara yang mengutip) |

Setiap sitasi menautkan pasal ke dokumen melalui `documentType`
(`GUGATAN`, `JAWABAN`, `REPLIK`, `DUPLIK`, `KESIMPULAN`, `PUTUSAN`, `MEMO`,
`LAINNYA`) dan `documentTitle`.

Status validasi sitasi: `VALID`, `WARNING` (mis. pasal pernah diubah, sumber
belum terkurasi, lingkungan peradilan berbeda), atau `INVALID` (pasal/peraturan
dicabut atau belum berlaku). Sitasi `INVALID` ditolak dengan HTTP 400 kecuali
dikirim dengan `force: true`.

### Pencarian Peraturan

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| GET | `/api/legal-sources/search` | Full-text search (GIN + `tsvector`) dengan `q`, `kind`, `limit`, `at` |
| POST | `/api/legal-sources/search/semantic` | Pencarian semantik pgvector (cosine distance) |

Migrasi `5_legal_source_fulltext` menambahkan kolom `tsvector` (GENERATED ALWAYS
STORED) pada `Regulation`, `Article`, dan `Jurisprudence` beserta indeks GIN,
serta kolom `embedding vector(1536)` dengan indeks ivfflat untuk pencarian
semantik. Embedding diisi oleh pipeline AI (F8); sampai itu tersedia endpoint
semantik mengembalikan hasil kosong.

Input pencarian pengguna dinetralkan menjadi `tsquery` berawalan prefiks dan
dihubungkan dengan operator `AND` sehingga tidak dapat menyuntikkan operator
tsquery mentah.

---

## Konfigurasi Environment

Salin `.env.example` menjadi `.env` lalu sesuaikan variabel berikut:

Untuk konfigurasi per lingkungan, gunakan template `.env.development.example`,
`.env.staging.example`, atau `.env.production.example`. Salin menjadi file tanpa
akhiran `.example`, lalu tetapkan `NODE_ENV` dari runtime/deployment. File dibaca
dengan prioritas `.env.<environment>.local` → `.env.<environment>` → `.env.local`
→ `.env`.

Pada staging/production, secret dapat disediakan oleh Docker/Kubernetes secret
mount menggunakan akhiran `_FILE`, misalnya
`JWT_ACCESS_SECRET_FILE=/run/secrets/jwt_access_secret`. Jangan mengisi variabel
langsung dan versi `_FILE` secara bersamaan. Secret yang didukung mencakup URL
database/Redis, JWT, storage, encryption, AI, signature, payment, notification,
dan video provider.

Docker Compose menggunakan port host statis `55432` untuk PostgreSQL dan `56379`
untuk Redis agar tidak berbenturan dengan instalasi lokal pada port default.

```env
# Application
NODE_ENV=development
APP_PORT=3000
APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/elawyer

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=changeme
JWT_EXPIRES_IN=15m
OAUTH_CLIENT_ID=
OAUTH_CLIENT_SECRET=

# Storage (S3 / GCS)
STORAGE_BUCKET=
STORAGE_REGION=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=

# Encryption
ENCRYPTION_KEY=changeme-aes256-key

# Trusted Timestamp & Integrity
TSA_URL=
INTEGRITY_HASH_ALGO=sha256

# AI / LLM
AI_PROVIDER=
AI_API_KEY=
AI_EMBEDDING_MODEL=
AI_VECTOR_DIM=1536

# E-Signature & E-Meterai
ESIGN_PROVIDER=
ESIGN_API_KEY=
EMETERAI_API_KEY=

# Payment Gateway & Escrow
PAYMENT_PROVIDER=
PAYMENT_SERVER_KEY=
ESCROW_ACCOUNT_ID=

# Notification
SMTP_URL=
WHATSAPP_API_KEY=
PUSH_PROVIDER_KEY=

# Video Conference
VIDEO_PROVIDER=
VIDEO_API_KEY=
```

> ⚠️ **Jangan pernah commit file `.env`** ke repositori. Gunakan secret manager untuk produksi.

---

## Struktur Proyek

Struktur berikut adalah usulan (belum diimplementasikan):

```
e-lawyer/
├── apps/
│   ├── web/            # React SPA (portal advokat, pengadilan, klien)
│   └── api/            # Backend API (NestJS / FastAPI)
├── services/
│   ├── ai/             # RAG, prediksi, embedding, citation engine
│   ├── scheduler/      # Reminder sidang, SLA, eskalasi (queue worker)
│   └── integrity/      # Hashing, TSA, audit log service
├── packages/
│   ├── ui/             # Komponen UI bersama
│   ├── config/         # Konfigurasi bersama (eslint, tsconfig)
│   └── types/          # Tipe/schema bersama
├── data/
│   ├── regulations/    # Sumber peraturan (UU, Perma, SEMA)
│   └── templates/      # Template dokumen, surat kuasa, putusan
├── prisma/             # Schema & migrasi database
├── docker-compose.yml
├── .env.example
├── TODO.md             # Rincian task per fitur
└── README.md
```

---

## Keamanan & Kepatuhan

Sistem dirancang untuk memenuhi standar kerahasiaan hubungan Advokat–Klien dan integritas proses hukum:

- **Hak Akses Berjenjang (RBAC):** Akses dikelompokkan berdasarkan peran advokat, pengadilan, dan klien.
- **Enkripsi Dokumen:** Seluruh berkas dienkripsi (AES-256) sebelum disimpan.
- **Enkripsi Transmisi:** Seluruh komunikasi menggunakan TLS 1.3.
- **Integritas Berkas:** Hash SHA-256 + *trusted timestamp* untuk mendeteksi manipulasi.
- **Audit Logs:** Pencatatan permanen (*append-only*) untuk aktivitas unduh, ubah, dan hapus berkas.
- **Privasi AI:** Data perkara yang dikirim ke layanan AI harus dianonimisasi sesuai kebijakan privasi.

---

## Roadmap

- [ ] **F0 — Fondasi & Setup:** monorepo, Docker, auth, RBAC, audit log, CI/CD
- [ ] **F1 — Manajemen Perkara & Klien:** CRUD klien/perkara multi-peradilan, para pihak, riwayat interaksi
- [ ] **F2 — Konsultasi Legal Digital:** portal konsultasi, chat E2EE, video call, upload berkas
- [ ] **F3 — Basis Peraturan & Sitasi Pasal:** ingest peraturan, katalog per-pasal, validasi sitasi
- [ ] **F4 — Integritas & Anti-Manipulasi:** hashing, TSA, immutable dokumen, deteksi anomali
- [ ] **F5 — Otomatisasi Dokumen & Putusan:** generator surat kuasa/gugatan, penyusun putusan, e-signature & e-meterai
- [ ] **F6 — Jadwal Sidang & Anti-Molor:** kalender, limit penundaan, reminder, eskalasi, SLA
- [ ] **F7 — Waktu, Billing & Pembayaran:** time tracking, escrow, invoice, pajak, payment gateway
- [ ] **F8 — AI Legal Analytics:** case scoring, yurisprudensi search, prediksi, asisten RAG
- [ ] **F9 — Keamanan & Kepatuhan:** hardening, privacy, audit viewer, uji penetrasi
- [ ] **F10 — SPA Enhancements:** PWA, offline cache, push notification, aksesibilitas

> Rincian task per fitur tersedia di [`TODO.md`](./TODO.md).

---

## Kontribusi

1. Buat branch baru: `git checkout -b feature/nama-fitur`
2. Commit perubahan: `git commit -m "feat: deskripsi singkat"`
3. Push branch: `git push origin feature/nama-fitur`
4. Buka Pull Request untuk review.

Ikuti konvensi [Conventional Commits](https://www.conventionalcommits.org/).

---

## Lisensi

Hak Cipta © 2026 e-Lawyer Team. Seluruh hak dilindungi undang-undang. *Proprietary — All rights reserved.*
