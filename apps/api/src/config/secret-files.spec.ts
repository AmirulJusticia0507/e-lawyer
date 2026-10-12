import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveSecretFiles } from './secret-files';

describe('resolveSecretFiles', () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'elawyer-secrets-'));
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('loads and trims a supported secret file', () => {
    const path = join(directory, 'jwt-access');
    writeFileSync(path, 'secret-value\n');

    expect(resolveSecretFiles({ JWT_ACCESS_SECRET_FILE: path })).toMatchObject({
      JWT_ACCESS_SECRET: 'secret-value',
    });
  });

  it('rejects ambiguous direct and file-based values', () => {
    expect(() =>
      resolveSecretFiles({
        JWT_ACCESS_SECRET: 'direct',
        JWT_ACCESS_SECRET_FILE: 'unused',
      }),
    ).toThrow('bukan keduanya');
  });

  it('rejects an unreadable secret file', () => {
    expect(() =>
      resolveSecretFiles({ JWT_REFRESH_SECRET_FILE: join(directory, 'missing') }),
    ).toThrow('tidak dapat dibaca');
  });
});
