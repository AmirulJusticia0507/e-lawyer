# e-Lawyer Platform

> Platform *Legal Tech* terpadu untuk merampingkan praktik hukum digital, manajemen kasus, konsultasi klien, serta otomatisasi dokumen bagi advokat dan firma hukum.

[![Status](https://img.shields.io/badge/status-planning-yellow)]()
[![License](https://img.shields.io/badge/license-proprietary-red)]()

---

## Daftar Isi

- [Tentang](#tentang)
- [Fitur Utama](#fitur-utama)
- [Arsitektur & Teknologi](#arsitektur--teknologi)
- [Peran Pengguna (RBAC)](#peran-pengguna-rbac)
- [Alur Sistem](#alur-sistem)
- [Panduan Instalasi](#panduan-instalasi)
- [Konfigurasi Environment](#konfigurasi-environment)
- [Struktur Proyek](#struktur-proyek)
- [Keamanan & Privasi Data](#keamanan--privasi-data)
- [Roadmap](#roadmap)
- [Kontribusi](#kontribusi)
- [Lisensi](#lisensi)

---

## Tentang

**e-Lawyer** adalah platform *Legal Tech* terpadu yang dirancang untuk merampingkan praktik hukum digital, manajemen kasus, konsultasi klien, serta otomatisasi dokumen bagi advokat dan firma hukum.

Sistem ini dibangun untuk memenuhi standar kerahasiaan hubungan **Advokat–Klien** (*Attorney–Client Privilege*) dengan enkripsi menyeluruh dan audit trail yang lengkap.

---

## Fitur Utama

### 1. Manajemen Perkara & Klien (Case & Client Management)
- Pelacakan status perkara (litigasi dan non-litigasi).
- Penjadwalan sidang, jadwal konsultasi, dan pengingat *deadline*.
- Manajemen repositori data klien dan riwayat interaksi.

### 2. Konsultasi Legal Digital (Virtual Consultation Portal)
- Portal klien mandiri untuk pengajuan konsultasi online.
- Modul perpesanan terenkripsi dan integrasi *video conference*.
- Portal unggah dan verifikasi berkas perkara secara aman.

### 3. Otomatisasi Dokumen Hukum (Document Automation)
- Generator draf surat kuasa, kontrak, dan perjanjian legal otomatis.
- Manajemen versi dokumen (*version control*) dan riwayat revisi.
- Integrasi tanda tangan digital (*E-Signature*) yang sah secara hukum.

### 4. Pencatatan Waktu & Keuangan (Time Tracking & Invoicing)
- Pencatatan jam kerja advokat (*Billable Hours counter*).
- Pembuatan *invoice* otomatis berbasis tarif layanan atau *retainer*.
- Integrasi *payment gateway* untuk pembayaran layanan hukum.

### 5. Keamanan & Audit Trail
- *End-to-End Encryption* untuk menjaga kerahasiaan *Attorney-Client Privilege*.
- Log aktivitas terpusat untuk memantau akses dan perubahan berkas.

---

## Arsitektur & Teknologi

| Layer | Teknologi |
|-------|-----------|
| **Frontend Web** | React / Next.js |
| **Mobile** | React Native |
| **Backend** | Node.js (NestJS / Express) atau Python (FastAPI) |
| **Database** | PostgreSQL (relasional) & Redis (session/caching) |
| **Storage** | Amazon S3 / Google Cloud Storage (dokumen terenkripsi) |
| **Security** | AES-256 (at-rest), TLS 1.3 (in-transit), OAuth2/JWT, RBAC |

---

## Peran Pengguna (RBAC)

| Peran | Deskripsi Akses |
|-------|-----------------|
| **Admin** | Konfigurasi sistem, kelola pengguna, kelola RBAC, audit log |
| **Managing Partner** | Overview firma, laporan keuangan, semua perkara |
| **Senior Associate** | Kelola perkara, dokumen, billing tim |
| **Junior Associate** | Perkara yang ditugaskan, dokumen, time tracking |
| **Paralegal** | Dukungan perkara, dokumen, jadwal |
| **Klien** | Portal konsultasi, upload berkas, status perkara, invoice |

---

## Alur Sistem

```
Registrasi/Login (OAuth2/JWT)
        │
        ▼
  RBAC menentukan akses fitur
        │
 ┌──────────────┬───────────────┬──────────────┬──────────────┐
 │ Konsultasi   │ Manajemen     │ Otomatisasi  │ Time &       │
 │ Digital      │ Perkara/Klien │ Dokumen      │ Invoicing    │
 └──────┬───────┴───────┬───────┴──────┬───────┴──────┬───────┘
        ▼               ▼              ▼              ▼
  Chat/Video      Jadwal Sidang   Generator +    Billable Hour
  + Upload Berkas + Deadline      E-Signature    + Invoice
        ▼               ▼              ▼              ▼
        └───────────────┴──────────────┴──────────────┘
                        ▼
             Audit Trail + Enkripsi AES-256
                        ▼
                 Storage Terenkripsi (S3/GCS)
```

**Alur bisnis end-to-end:**

1. **Onboarding Klien** — Admin/advokat mengundang klien, klien membuat akun.
2. **Pengajuan Konsultasi** — Klien submit via portal → advokat review → penjadwalan → chat/video → berkas diverifikasi.
3. **Pembukaan Perkara** — Perkara dibuat + assign advokat → tracking status → jadwal sidang + reminder *deadline*.
4. **Produksi Dokumen** — Pilih template → generate draf → *version control* → *e-signature* → arsip.
5. **Monetisasi** — Timer mencatat jam kerja → invoice otomatis → pembayaran via payment gateway.
6. **Audit** — Setiap unduh/ubah/hapus berkas tercatat permanen.

---

## Panduan Instalasi

### Prasyarat

- Node.js versi 18.x atau lebih baru
- PostgreSQL versi 14.x atau lebih baru
- Docker & Docker Compose (opsional)
- Redis (untuk session/caching)

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

---

## Konfigurasi Environment

Salin `.env.example` menjadi `.env` lalu sesuaikan variabel berikut:

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

# Payment Gateway
PAYMENT_PROVIDER=
PAYMENT_SERVER_KEY=

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
│   ├── web/            # Next.js (portal web advokat & klien)
│   ├── mobile/         # React Native (klien/advokat)
│   └── api/            # Backend API (NestJS / FastAPI)
├── packages/
│   ├── ui/             # Komponen UI bersama
│   ├── config/         # Konfigurasi bersama (eslint, tsconfig)
│   └── types/          # Tipe/schema bersama
├── prisma/             # Schema & migrasi database
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Keamanan & Privasi Data

Sistem dirancang untuk memenuhi standar kerahasiaan hubungan Advokat–Klien:

- **Hak Akses Berjenjang (RBAC):** Hak akses dikelompokkan berdasarkan peran (Admin, Managing Partner, Senior/Junior Associate, Paralegal, Klien).
- **Enkripsi Dokumen:** Seluruh berkas perkara dienkripsi (AES-256) sebelum disimpan ke server storage.
- **Enkripsi Transmisi:** Seluruh komunikasi menggunakan TLS 1.3.
- **Audit Logs:** Pencatatan permanen untuk aktivitas unduh, ubah, dan hapus berkas.

---

## Roadmap

- [ ] **F0 — Fondasi & Setup:** monorepo, Docker, auth, RBAC, audit log, CI/CD
- [ ] **F1 — Manajemen Perkara & Klien:** CRUD klien/perkara, jadwal, reminder
- [ ] **F2 — Konsultasi Legal Digital:** portal konsultasi, chat E2EE, video call, upload berkas
- [ ] **F3 — Otomatisasi Dokumen:** template, generator, version control, e-signature
- [ ] **F4 — Time Tracking & Invoicing:** timer, tarif, invoice, payment gateway
- [ ] **F5 — Keamanan & Audit Trail:** enkripsi, hardening, audit viewer
- [ ] **F6 — Mobile App:** React Native untuk klien & advokat

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
