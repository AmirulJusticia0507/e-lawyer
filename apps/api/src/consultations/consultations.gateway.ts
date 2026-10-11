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
import { PrismaService } from '../prisma/prisma.service';
import { RoleName } from '../common/constants/roles';

const STAFF_ROLES = new Set<string>([
  RoleName.ADMIN,
  RoleName.MANAGING_PARTNER,
  RoleName.SENIOR_ASSOCIATE,
  RoleName.JUNIOR_ASSOCIATE,
  RoleName.PARALEGAL,
  RoleName.CLERK,
]);

export type ChatSocket = Socket & {
  user?: { id: string; email: string; roles: string[] };
};

@WebSocketGateway({
  namespace: '/consultations',
  cors: { origin: true, credentials: true },
})
export class ConsultationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: ChatSocket): Promise<void> {
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
        roles?: string[];
      };
      if (payload.type !== 'access') {
        throw new Error('Bukan access token');
      }
      client.user = { id: payload.sub, email: payload.email, roles: payload.roles ?? [] };
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('join')
  async onJoin(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() payload: { consultationId?: string } | string,
  ): Promise<{ ok: boolean; error?: string }> {
    if (!client.user) {
      return { ok: false, error: 'Unauthorized' };
    }
    const consultationId =
      typeof payload === 'string' ? payload : payload.consultationId ?? '';
    const allowed = await this.canAccess(client.user.id, client.user.roles, consultationId);
    if (!allowed) {
      return { ok: false, error: 'Forbidden' };
    }
    await client.join(this.room(consultationId));
    return { ok: true };
  }

  notifyMessage(consultationId: string, message: unknown): void {
    this.server.to(this.room(consultationId)).emit('message:new', message);
  }

  notifyStatus(consultationId: string, consultation: unknown): void {
    this.server.to(this.room(consultationId)).emit('status:changed', consultation);
  }

  private room(id: string): string {
    return `consultation:${id}`;
  }

  private async canAccess(
    userId: string,
    userRoles: string[],
    consultationId: string,
  ): Promise<boolean> {
    if (userRoles.some((r) => STAFF_ROLES.has(r))) {
      return true;
    }
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      select: { requestedById: true, assignedToUserId: true },
    });
    if (!consultation) {
      return false;
    }
    return (
      consultation.requestedById === userId || consultation.assignedToUserId === userId
    );
  }
}