import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';

const SUPERVISOR_PERMISSIONS = new Set(['READ:ANOMALY', 'UPDATE:ANOMALY']);

export type IntegritySocket = Socket & {
  user?: { id: string; email: string; permissions: string[] };
};

@WebSocketGateway({
  namespace: '/integrity',
  cors: { origin: true, credentials: true },
})
export class IntegrityGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: IntegritySocket): Promise<void> {
    try {
      const auth = client.handshake.auth as { token?: string } | undefined;
      const header = client.handshake.headers.authorization;
      const token = auth?.token ?? header?.replace('Bearer ', '');
      if (!token) {
        throw new Error('Token tidak ada');
      }
      const payload = this.jwt.verify(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      }) as {
        sub: string;
        email: string;
        type: string;
        permissions?: string[];
      };
      if (payload.type !== 'access') {
        throw new Error('Bukan access token');
      }
      client.user = {
        id: payload.sub,
        email: payload.email,
        permissions: payload.permissions ?? [],
      };
      const isSupervisor = (payload.permissions ?? []).some((p) =>
        SUPERVISOR_PERMISSIONS.has(p),
      );
      if (isSupervisor) {
        await client.join('supervisors');
      }
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('join')
  onJoin(
    @ConnectedSocket() client: IntegritySocket,
    @MessageBody() payload: { caseId?: string } | string,
  ): { ok: boolean; error?: string } {
    if (!client.user) {
      return { ok: false, error: 'Unauthorized' };
    }
    if (!client.user.permissions.includes('READ:INTEGRITY')) {
      return { ok: false, error: 'Forbidden' };
    }
    const caseId = typeof payload === 'string' ? payload : payload.caseId ?? '';
    if (!caseId) {
      return { ok: false, error: 'caseId wajib diisi' };
    }
    void client.join(this.caseRoom(caseId));
    return { ok: true };
  }

  notifyAnomaly(anomaly: unknown, caseId?: string | null): void {
    this.server.to('supervisors').emit('anomaly:new', anomaly);
    if (caseId) {
      this.server.to(this.caseRoom(caseId)).emit('anomaly:new', anomaly);
    }
  }

  private caseRoom(caseId: string): string {
    return `case:${caseId}`;
  }
}
