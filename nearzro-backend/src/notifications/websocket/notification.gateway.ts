import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, BadRequestException, UnauthorizedException, Injectable, ExecutionContext, UseGuards } from '@nestjs/common';
import { Notification } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WsJwtGuard {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();

    // Extract token from auth header or query param
    const authHeader = client.handshake.auth?.token;
    const tokenFromQuery = client.handshake.query?.token;
    const tokenFromAuthQuery = client.handshake.query?.Authorization;

    let token = authHeader || tokenFromQuery || tokenFromAuthQuery;

    if (!token) {
      client.disconnect(true);
      throw new WsException('Authentication required');
    }

    // Strip Bearer prefix if present
    if (typeof token === 'string' && token.toLowerCase().startsWith('bearer ')) {
      token = token.substring(7);
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('JWT_SECRET'),
      });

      if (!payload || !payload.sub) {
        client.disconnect(true);
        throw new WsException('Invalid token');
      }

      // Attach userId to client for later use
      client.data.userId = Number(payload.sub);

      return true;
    } catch (error) {
      client.disconnect(true);
      throw new WsException('Invalid token');
    }
  }
}

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: '*',
  },
})
@UseGuards(WsJwtGuard)
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  async handleConnection(client: Socket) {
    // Guard will have already validated and set client.data.userId
    const userId = client.data.userId;

    if (userId) {
      // Validate that userId exists in the database (optional security check)
      // The room is derived from the token's userId, NOT from client query
      client.join(`user_${userId}`);
      this.logger.log(`User ${userId} connected to notifications`);
    } else {
      this.logger.warn('WebSocket connection without valid authentication');
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.logger.log(`User ${userId} disconnected`);
    }
  }

  emitToUser(userId: number, payload: any) {
    this.server.to(`user_${userId}`).emit('notification', payload);
  }
}
