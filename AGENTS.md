# AGENTS.md

## Aturan Kerja (WAJIB)

- **Setiap task WAJIB di-commit dan di-push** setelah selesai.
  - Satu task = satu commit (atomic), kecuali task terkait yang logis digabung.
  - Gunakan [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
  - Push ke `origin/main` (atau branch kerja aktif) setelah commit.
- Jangan commit file rahasia (`.env`, kredensial). Gunakan `.env.example`.
- Sebelum commit, jalankan lint/typecheck/test bila tersedia.
- usahakan pakai indonesia selama percakapan
