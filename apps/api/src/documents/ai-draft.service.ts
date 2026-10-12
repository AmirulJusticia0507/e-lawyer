import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentType } from '@prisma/client';
import { GenerateAiDraftDto } from './dto/document.dto';

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
}

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  POWER_OF_ATTORNEY: 'surat kuasa',
  COMPLAINT: 'gugatan',
  ANSWER: 'jawaban',
  REPLY: 'replik',
  DUPLICATION: 'duplik',
  CONCLUSION: 'kesimpulan',
  JUDGMENT: 'putusan',
  OTHER: 'dokumen hukum',
};

@Injectable()
export class AiDraftService {
  constructor(private readonly config: ConfigService) {}

  async generate(dto: GenerateAiDraftDto): Promise<{ draft: string }> {
    const apiKey = this.config.get<string>('AI_API_KEY')?.trim();
    const model = this.config.get<string>('AI_MODEL')?.trim();
    if (!apiKey || !model) {
      throw new ServiceUnavailableException('Asisten AI belum dikonfigurasi (AI_API_KEY dan AI_MODEL diperlukan)');
    }

    const baseUrl = this.config.get<string>('AI_BASE_URL', 'https://griphubrouter.web.id/v1').replace(/\/+$/, '');
    let endpoint: URL;
    try {
      endpoint = new URL(`${baseUrl}/chat/completions`);
    } catch {
      throw new ServiceUnavailableException('AI_BASE_URL bukan URL yang valid');
    }
    if (endpoint.protocol !== 'https:') {
      throw new ServiceUnavailableException('AI_BASE_URL harus menggunakan HTTPS');
    }

    const userContent = [
      `Instruksi pengguna:\n${dto.instruction}`,
      dto.sourceText ? `Teks sumber yang diberikan pengguna:\n${dto.sourceText}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content:
                `Bantu menyusun draf ${DOCUMENT_TYPE_LABELS[dto.documentType]} dalam bahasa Indonesia. ` +
                'Gunakan hanya fakta dan bahan yang diberikan pengguna. Jangan mengarang fakta, aturan, atau sitasi; ' +
                'tandai informasi yang kurang sebagai placeholder. Hasil adalah draf untuk ditinjau manusia, bukan nasihat hukum final.',
            },
            { role: 'user', content: userContent },
          ],
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new GatewayTimeoutException('Provider AI tidak merespons dalam batas waktu');
      }
      throw new BadGatewayException('Tidak dapat terhubung ke provider AI');
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new BadGatewayException(`Provider AI mengembalikan status HTTP ${response.status}`);
    }

    let result: ChatCompletionResponse;
    try {
      result = (await response.json()) as ChatCompletionResponse;
    } catch {
      throw new BadGatewayException('Provider AI mengembalikan respons yang bukan JSON valid');
    }

    const draft = result.choices?.[0]?.message?.content;
    if (typeof draft !== 'string' || !draft.trim()) {
      throw new BadGatewayException('Provider AI tidak mengembalikan teks draf');
    }
    if (draft.length > 30000) {
      throw new BadGatewayException('Respons AI terlalu panjang untuk digunakan sebagai draf');
    }
    return { draft: draft.trim() };
  }
}
