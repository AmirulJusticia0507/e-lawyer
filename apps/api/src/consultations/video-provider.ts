// Abstraksi provider video conference. Implementasi provider live (Daily.co) diaktivasi
// hanya ketika DAILY_API_KEY tersedia; selain itu fallback ke WebRTC room lokal.

export interface VideoRoom {
  roomId: string;
  roomUrl: string;
}

export interface VideoRoomProvider {
  name: string;
  createRoom(roomName: string, expiresInMinutes?: number): Promise<VideoRoom>;
  deleteRoom(roomName: string): Promise<void>;
}

export class DailyVideoProvider implements VideoRoomProvider {
  constructor(private readonly apiKey: string, private readonly baseUrl = 'https://api.daily.co') {}

  get name(): string { return 'daily'; }

  async createRoom(roomName: string, expiresInMinutes = 120): Promise<VideoRoom> {
    const exp = Math.floor(Date.now() / 1000) + expiresInMinutes * 60;
    const body = {
      name: roomName,
      properties: {
        exp,
        max_participants: 20,
        enable_recording: 'cloud',
        enable_chat: true,
        enable_screenshare: true,
      },
    };
    const response = await fetch(`${this.baseUrl.replace(/\/+$/, '')}/v1/rooms`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Daily.co createRoom gagal: HTTP ${response.status} ${text}`);
    }
    const data = (await response.json()) as { name: string; url: string };
    return { roomId: data.name, roomUrl: data.url };
  }

  async deleteRoom(roomName: string): Promise<void> {
    const response = await fetch(`${this.baseUrl.replace(/\/+$/, '')}/v1/rooms/${encodeURIComponent(roomName)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    // 404 dianggap sukses (room sudah terhapus)
    if (!response.ok && response.status !== 404) {
      const text = await response.text().catch(() => '');
      throw new Error(`Daily.co deleteRoom gagal: HTTP ${response.status} ${text}`);
    }
  }
}

export function resolveVideoProvider(config: { get: (key: string, defaultValue?: string) => string | undefined }): VideoRoomProvider | null {
  const key = config.get('DAILY_API_KEY');
  if (!key) return null;
  const baseUrl = config.get('DAILY_BASE_URL') || 'https://api.daily.co';
  return new DailyVideoProvider(key, baseUrl);
}