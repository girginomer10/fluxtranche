import WebSocket from 'ws';
import { logger } from '../utils/logger';

interface StreamingClient {
  ws: WebSocket;
  channelIds: Set<string>;
  lastPing: number;
}

export class StreamingService {
  private clients: Map<WebSocket, StreamingClient>;
  private wss: WebSocket.Server;
  private heartbeatInterval: NodeJS.Timeout;

  constructor(wss: WebSocket.Server) {
    this.clients = new Map();
    this.wss = wss;
    
    // Start heartbeat to keep connections alive
    this.heartbeatInterval = setInterval(() => {
      this.heartbeat();
    }, 30000); // 30 seconds

    logger.info('StreamingService initialized');
  }

  handleMessage(ws: WebSocket, data: any): void {
    const client = this.clients.get(ws);
    if (!client) {
      logger.warn('Message from unregistered client');
      return;
    }

    switch (data.type) {
      case 'subscribe':
        this.handleSubscribe(ws, data.channelId);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(ws, data.channelId);
        break;
      case 'ping':
        this.handlePing(ws);
        break;
      default:
        logger.warn('Unknown message type:', data.type);
    }
  }

  private handleSubscribe(ws: WebSocket, channelId: string): void {
    const client = this.clients.get(ws);
    if (!client) return;

    client.channelIds.add(channelId);
    logger.info(`Client subscribed to channel: ${channelId}`);

    ws.send(JSON.stringify({
      type: 'subscribed',
      channelId,
      timestamp: Date.now()
    }));
  }

  private handleUnsubscribe(ws: WebSocket, channelId: string): void {
    const client = this.clients.get(ws);
    if (!client) return;

    client.channelIds.delete(channelId);
    logger.info(`Client unsubscribed from channel: ${channelId}`);

    ws.send(JSON.stringify({
      type: 'unsubscribed',
      channelId,
      timestamp: Date.now()
    }));
  }

  private handlePing(ws: WebSocket): void {
    const client = this.clients.get(ws);
    if (!client) return;

    client.lastPing = Date.now();
    ws.send(JSON.stringify({
      type: 'pong',
      timestamp: Date.now()
    }));
  }

  addClient(ws: WebSocket): void {
    const client: StreamingClient = {
      ws,
      channelIds: new Set(),
      lastPing: Date.now()
    };

    this.clients.set(ws, client);
    logger.info(`New streaming client added. Total clients: ${this.clients.size}`);
  }

  removeClient(ws: WebSocket): void {
    const client = this.clients.get(ws);
    if (client) {
      this.clients.delete(ws);
      logger.info(`Client removed. Total clients: ${this.clients.size}`);
    }
  }

  notifyStreamStart(channelId: string, streamId: string, details: any): void {
    this.broadcastToChannel(channelId, {
      type: 'stream_started',
      channelId,
      streamId,
      details,
      timestamp: Date.now()
    });
  }

  notifyStreamProgress(channelId: string, streamId: string, progress: number, streamedAmount: number): void {
    this.broadcastToChannel(channelId, {
      type: 'stream_progress',
      channelId,
      streamId,
      progress,
      streamedAmount,
      timestamp: Date.now()
    });
  }

  notifyStreamComplete(channelId: string, streamId: string, finalAmount: number): void {
    this.broadcastToChannel(channelId, {
      type: 'stream_completed',
      channelId,
      streamId,
      finalAmount,
      timestamp: Date.now()
    });
  }

  notifySettlement(channelId: string, settlement: any): void {
    this.broadcastToChannel(channelId, {
      type: 'channel_settled',
      channelId,
      settlement,
      timestamp: Date.now()
    });
  }

  private broadcastToChannel(channelId: string, message: any): void {
    let sentCount = 0;

    this.clients.forEach((client) => {
      if (client.channelIds.has(channelId) && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify(message));
          sentCount++;
        } catch (error) {
          logger.error('Failed to send message to client:', error);
          this.removeClient(client.ws);
        }
      }
    });

    logger.debug(`Broadcast to channel ${channelId}: ${sentCount} clients notified`);
  }

  private heartbeat(): void {
    const now = Date.now();
    const staleClients: WebSocket[] = [];

    this.clients.forEach((client, ws) => {
      if (now - client.lastPing > 60000) { // 60 seconds timeout
        staleClients.push(ws);
      } else if (ws.readyState === WebSocket.OPEN) {
        // Send ping to active clients
        try {
          ws.send(JSON.stringify({
            type: 'ping',
            timestamp: now
          }));
        } catch (error) {
          logger.error('Failed to ping client:', error);
          staleClients.push(ws);
        }
      }
    });

    // Remove stale clients
    staleClients.forEach(ws => {
      logger.info('Removing stale client');
      this.removeClient(ws);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    if (staleClients.length > 0) {
      logger.info(`Cleaned up ${staleClients.length} stale connections`);
    }
  }

  getStats(): any {
    const channelSubscriptions: Record<string, number> = {};
    
    this.clients.forEach((client) => {
      client.channelIds.forEach(channelId => {
        channelSubscriptions[channelId] = (channelSubscriptions[channelId] || 0) + 1;
      });
    });

    return {
      totalClients: this.clients.size,
      activeClients: Array.from(this.clients.values())
        .filter(client => client.ws.readyState === WebSocket.OPEN).length,
      channelSubscriptions,
      timestamp: Date.now()
    };
  }

  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all client connections
    this.clients.forEach((client, ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    this.clients.clear();
    logger.info('StreamingService destroyed');
  }
}