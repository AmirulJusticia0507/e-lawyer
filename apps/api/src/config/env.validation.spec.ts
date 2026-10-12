import 'reflect-metadata';
import { validateEnv } from './env.validation';

const base = {
  DATABASE_URL: 'postgresql://elawyer:elawyer@localhost:55432/elawyer?schema=public',
  JWT_ACCESS_SECRET: 'access',
  JWT_REFRESH_SECRET: 'refresh',
};

describe('validateEnv', () => {
  it('mengubah variabel numerik dari string menjadi number', () => {
    const result = validateEnv({ ...base, APP_PORT: '3999', BCRYPT_ROUNDS: '10' });
    expect(result.APP_PORT).toBe(3999);
    expect(result.BCRYPT_ROUNDS).toBe(10);
  });

  it('memakai nilai default bila variabel numerik tidak diisi', () => {
    const result = validateEnv({ ...base });
    expect(result.APP_PORT).toBe(3000);
    expect(result.BCRYPT_ROUNDS).toBe(12);
  });

  it('memakai endpoint AI yang disediakan dan menerima model dari environment', () => {
    const result = validateEnv({ ...base, AI_MODEL: 'router/model-slug' });
    expect(result.AI_BASE_URL).toBe('https://griphubrouter.web.id/v1');
    expect(result.AI_MODEL).toBe('router/model-slug');
  });

  it('menolak nilai numerik di luar rentang', () => {
    expect(() => validateEnv({ ...base, BCRYPT_ROUNDS: '99' })).toThrow(
      /Konfigurasi environment tidak valid/,
    );
  });

  it('menolak konfigurasi tanpa kredensial wajib', () => {
    expect(() => validateEnv({})).toThrow(/Konfigurasi environment tidak valid/);
  });

  it('membaca secret dari *_FILE', () => {
    const withoutDatabaseUrl: Record<string, string> = { ...base };
    delete withoutDatabaseUrl.DATABASE_URL;
    expect(() =>
      validateEnv({ ...withoutDatabaseUrl, DATABASE_URL_FILE: 'C:/tidak-ada.txt' }),
    ).toThrow(/tidak dapat dibaca/);
  });

  it('menolak secret yang diisi ganda lewat nilai dan *_FILE', () => {
    expect(() =>
      validateEnv({ ...base, DATABASE_URL_FILE: 'C:/tidak-ada.txt' }),
    ).toThrow(/Gunakan salah satu/);
  });
});