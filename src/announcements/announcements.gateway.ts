import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AnnouncementService } from './announcement.service';
import { ReactionType } from './entities/announcements-reaction.entities';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';

export interface ServerToClientEvents {
  'announcement:new': (data: any) => void;
  'announcement:update': (data: any) => void;
  'announcement:delete': (data: { id: string }) => void;
  'announcement:reaction': (data: ReactionUpdatePayload) => void;
  'announcement:view': (data: ViewUpdatePayload) => void;
  'announcement:pin': (data: { id: string; isPinned: boolean }) => void;
  error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  'announcement:addReaction': (data: AddReactionPayload) => void;
  'announcement:removeReaction': (data: { announcementId: string }) => void;
  'announcement:view': (data: ViewPayload) => void;
  'announcement:join': (data: { announcementId: string }) => void;
  'announcement:leave': (data: { announcementId: string }) => void;
}

interface AddReactionPayload {
  announcementId: string;
  reactionType: ReactionType;
}

interface ViewPayload {
  announcementId: string;
}

interface ReactionUpdatePayload {
  announcementId: string;
  reactions: { type: ReactionType; count: number }[];
  totalReactions: number;
  userId: number;
  reactionType: ReactionType | null;
  action: 'add' | 'remove';
}

interface ViewUpdatePayload {
  announcementId: string;
  viewCount: number;
  viewer?: {
    id: number;
    name: string;
    viewedAt: Date;
  };
}

interface AuthenticatedSocket extends Socket {
  user?: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}

@WebSocketGateway({
  namespace: '/announcements',
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class AnnouncementsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server<ClientToServerEvents, ServerToClientEvents>;

  private readonly logger = new Logger(AnnouncementsGateway.name);
  private connectedUser = new Map<String, AuthenticatedSocket>();

  constructor(
    private readonly announcementService: AnnouncementService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  afterInit(server: any) {
    this.logger.log('Announcements WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (token) {
        const payload = this.jwtService.verify(token, {
          secret: this.configService.get('JWT_SECRET'),
        });

        client.user = {
          id: payload.sub,
          email: payload.email,
          name: payload.name || 'User',
          role: payload.role,
        };

        this.connectedUser.set(client.id, client);
        this.logger.log(`Client connected: ${client.user.name} (ID: ${client.user.id})`);
      } else {
        this.logger.log(`Annonymous client connected: ${client.id}`);
      }

      client.join('announcements:global');
    } catch (error) {
      this.logger.warn(`Invalid token for client ${client.id}: ${error.message}`);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.connectedUser.delete(client.id);
    this.logger.log(`Client disconnected: ${client.user ? client.user.name : 'Unknown'} (ID: ${client.id})`);
  }

  @SubscribeMessage('announcement:join')
  handleJoinAnnouncement(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { annnouncementId: string },
  ) {
    const room = `announcement:${data.annnouncementId}`;
    client.join(room);
    this.logger.debug(`Client ${client.id} joined room ${room}`);
    return { success: true }
  }

  @SubscribeMessage('announcement:leave')
  handleLeaveAnnouncement(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { annnouncementId: string },
  ) {
    const room = `announcement:${data.annnouncementId}`;
    client.leave(room);
    this.logger.debug(`Client ${client.id} left room ${room}`);
    return { success: true }
  }

  @SubscribeMessage('announcement:addReaction')
  async handleAddReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: AddReactionPayload,
  ) {
    if (!client.user) {
      client.emit('error', { message: 'Unauthorized' });
      return { success: false };
    }

    try {
      const result = await this.announcementService.addReaction(
        data.announcementId,
        client.user.id,
        data.reactionType,
      );

      this.broadcastReactionUpdate(data.announcementId, {
        announcementId: data.announcementId,
        reactions: result.counts,
        totalReactions: result.counts.reduce((sum, r) => sum + r.count, 0),
        userId: client.user.id,
        reactionType: data.reactionType,
        action: 'add',
      });

      return { success: true, reaction: result.reaction };
    } catch (error) {
      client.emit('error', { message: error.message });
      return { success: false };
    }
  }

  @SubscribeMessage('announcement:removeReaction')
  async handleRemoveReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { announcementId: string },
  ) {
    if (!client.user) {
      client.emit('error', { message: 'Authentication required' });
      return { success: false };
    }

    try {
      const result = await this.announcementService.removeReaction(
        data.announcementId,
        client.user.id,
      );

      // Broadcast to all clients
      this.broadcastReactionUpdate(data.announcementId, {
        announcementId: data.announcementId,
        reactions: result.counts,
        totalReactions: result.counts.reduce((sum, r) => sum + r.count, 0),
        userId: client.user.id,
        reactionType: null,
        action: 'remove',
      });

      return { success: true };
    } catch (error) {
      client.emit('error', { message: error.message });
      return { success: false };
    }
  }

  @SubscribeMessage('announcement:view')
  async handleView(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: ViewPayload,
  ) {
    if (!client.user) {
      return { success: false };
    }

    try {
      const result = await this.announcementService.recordView(
        data.announcementId,
        client.user.id,
        client.handshake.address,
        client.handshake.headers['user-agent'],
      );

      if (result.isNewView) {
        // Broadcast view update
        this.broadcastViewUpdate(data.announcementId, {
          announcementId: data.announcementId,
          viewCount: result.viewCount,
          viewer: {
            id: client.user.id,
            name: client.user.name,
            viewedAt: new Date(),
          },
        });
      }

      return { success: true, viewCount: result.viewCount };
    } catch (error) {
      return { success: false };
    }
  }

  broadcastNewAnnouncement(announcement: any) {
    this.server.to('announcements:global').emit('announcement:new', announcement);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    this.logger.log(`📢 Broadcasted new announcement: ${announcement.id}`);
  }

  broadcastAnnouncementUpdate(announcement: any) {
    this.server.to('announcements:global').emit('announcement:update', announcement);
    this.server
      .to(`announcement:${announcement.id}`)
      .emit('announcement:update', announcement);
    this.logger.log(`📝 Broadcasted announcement update: ${announcement.id}`);
  }

  broadcastAnnouncementDelete(id: string) {
    this.server.to('announcements:global').emit('announcement:delete', { id });
    this.logger.log(`🗑️ Broadcasted announcement delete: ${id}`);
  }

  broadcastPinUpdate(id: string, isPinned: boolean) {
    this.server.to('announcements:global').emit('announcement:pin', { id, isPinned });
    this.logger.log(`📌 Broadcasted pin update: ${id} -> ${isPinned}`);
  }

  private broadcastReactionUpdate(announcementId: string, data: ReactionUpdatePayload) {
    this.server.to('announcements:global').emit('announcement:reaction', data);
    this.server.to(`announcement:${announcementId}`).emit('announcement:reaction', data);
  }

  private broadcastViewUpdate(announcementId: string, data: ViewUpdatePayload) {
    this.server.to(`announcement:${announcementId}`).emit('announcement:view', data);
  }

  getConnectedUsersCount(): number {
    return this.connectedUser.size;
  }
}
