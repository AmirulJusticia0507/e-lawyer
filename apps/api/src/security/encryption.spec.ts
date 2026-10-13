import {
  decryptBuffer,
  decryptBufferWithKeys,
  decryptText,
  decryptTextWithKeys,
  encryptBuffer,
  encryptText,
} from './encryption';

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

  it('rejects a key shorter than 32 bytes', () => {
    expect(() => encryptText('x', 'short-key')).toThrow('ENCRYPTION_KEY');
  });

  it('supports key rotation by trying the previous key', () => {
    const previous = 'previous-secret-with-sufficient-entropy';
    const current = 'current-secret-with-sufficient-entropy-1';
    const encryptedText = encryptText('rahasia lama', previous);
    const encryptedBuffer = encryptBuffer(Buffer.from('berkas lama'), previous);
    expect(decryptTextWithKeys(encryptedText, [current, previous])).toBe('rahasia lama');
    expect(decryptBufferWithKeys(encryptedBuffer, [current, previous]).toString()).toBe(
      'berkas lama',
    );
  });

  it('does not silently return ciphertext when authentication fails', () => {
    const encrypted = encryptText('rahasia', key);
    expect(() => decryptText(encrypted, 'different-secret-with-sufficient-entropy')).toThrow();
  });
});
