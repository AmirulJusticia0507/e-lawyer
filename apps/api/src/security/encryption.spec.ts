import { decryptBuffer, decryptText, encryptBuffer, encryptText } from './encryption';

const key = 'test-secret-with-sufficient-entropy';

describe('AES-256-GCM at-rest encryption', () => {
  it('round-trips text without storing plaintext', () => {
    const encrypted = encryptText('rahasia klien', key);
    expect(encrypted).not.toContain('rahasia klien');
    expect(decryptText(encrypted, key)).toBe('rahasia klien');
  });

  it('round-trips binary data and accepts legacy plaintext', () => {
    const value = Buffer.from([0, 1, 2, 255]);
    expect(decryptBuffer(encryptBuffer(value, key), key)).toEqual(value);
    expect(decryptBuffer(value, key)).toEqual(value);
  });

  it('rejects a default key', () => {
    expect(() => encryptText('x', 'changeme-aes256-key')).toThrow('ENCRYPTION_KEY');
  });
});
