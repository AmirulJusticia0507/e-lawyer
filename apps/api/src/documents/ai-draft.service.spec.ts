import { ConfigService } from '@nestjs/config';
import { DocumentType } from '@prisma/client';
import { AiDraftService } from './ai-draft.service';

describe('AiDraftService', () => {
  const configValues: Record<string, string> = {
    AI_API_KEY: 'test-key',
    AI_BASE_URL: 'https://griphubrouter.web.id/v1',
    AI_MODEL: 'test/model',
  };
  const config = {
    get: jest.fn((key: string, fallback?: string) => configValues[key] ?? fallback),
  } as unknown as ConfigService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(configValues, {
      AI_API_KEY: 'test-key',
      AI_BASE_URL: 'https://griphubrouter.web.id/v1',
      AI_MODEL: 'test/model',
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('mengirim hanya instruksi dan teks yang diberikan pengguna ke endpoint OpenAI-compatible', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: 'Draf hasil AI' } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    global.fetch = fetchMock;

    const result = await new AiDraftService(config).generate({
      documentType: DocumentType.COMPLAINT,
      instruction: 'Susun kerangka gugatan.',
      sourceText: 'Fakta yang saya berikan.',
    });

    expect(result).toEqual({ draft: 'Draf hasil AI' });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://griphubrouter.web.id/v1/chat/completions'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
        body: expect.stringContaining('"model":"test/model"'),
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      messages: Array<{ content: string }>;
    };
    expect(body.messages[1].content).toContain('Fakta yang saya berikan.');
    expect(body.messages[1].content).not.toContain('caseId');
  });

  it('menolak permintaan jika kunci atau slug model belum diatur', async () => {
    configValues.AI_API_KEY = '';
    await expect(
      new AiDraftService(config).generate({
        documentType: DocumentType.OTHER,
        instruction: 'Bantu susun draf.',
      }),
    ).rejects.toThrow('AI_API_KEY dan AI_MODEL diperlukan');
  });

  it('menolak URL provider yang tidak menggunakan HTTPS', async () => {
    configValues.AI_BASE_URL = 'http://griphubrouter.web.id/v1';
    await expect(
      new AiDraftService(config).generate({
        documentType: DocumentType.OTHER,
        instruction: 'Bantu susun draf.',
      }),
    ).rejects.toThrow('harus menggunakan HTTPS');
  });
});
