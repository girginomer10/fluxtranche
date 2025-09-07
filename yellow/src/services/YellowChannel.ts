import { ethers } from 'ethers';
import NodeCache from 'node-cache';
import { logger } from '../utils/logger';

interface Channel {
  id: string;
  participant1: string;
  participant2: string;
  balance: number;
  streams: Stream[];
  status: 'open' | 'closed' | 'settling';
  createdAt: number;
  settledAt?: number;
}

interface Stream {
  id: string;
  channelId: string;
  from: string;
  to: string;
  amount: number;
  rate: number; // per second
  startTime: number;
  endTime?: number;
  memo?: string;
  settled: boolean;
}

interface Settlement {
  channelId: string;
  finalBalances: Record<string, number>;
  totalStreamed: number;
  settledAt: number;
  txHash?: string;
}

export class YellowChannel {
  private channels: NodeCache;
  private streams: NodeCache;
  private streamIntervals: Map<string, NodeJS.Timeout>;
  private streamingService?: any;

  constructor(streamingService?: any) {
    this.channels = new NodeCache({ stdTTL: 3600 }); // 1 hour TTL
    this.streams = new NodeCache({ stdTTL: 3600 });
    this.streamIntervals = new Map();
    this.streamingService = streamingService;
    
    logger.info('YellowChannel service initialized');
  }

  async openChannel(
    participant1: string,
    participant2: string,
    initialBalance: number
  ): Promise<string> {
    const channelId = this.generateChannelId(participant1, participant2);
    
    const channel: Channel = {
      id: channelId,
      participant1,
      participant2,
      balance: initialBalance,
      streams: [],
      status: 'open',
      createdAt: Date.now()
    };
    
    this.channels.set(channelId, channel);
    
    logger.info(`Channel opened: ${channelId}`, {
      participants: [participant1, participant2],
      balance: initialBalance
    });
    
    return channelId;
  }

  async startStream(
    channelId: string,
    recipient: string,
    totalAmount: number,
    memo?: string,
    duration: number = 60 // 60 seconds default
  ): Promise<string> {
    const channel = this.channels.get<Channel>(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }
    
    if (channel.status !== 'open') {
      throw new Error('Channel is not open');
    }
    
    const streamId = this.generateStreamId();
    const rate = totalAmount / duration; // Amount per second
    
    const stream: Stream = {
      id: streamId,
      channelId,
      from: channel.participant1, // Assume participant1 is sender for demo
      to: recipient,
      amount: totalAmount,
      rate,
      startTime: Date.now(),
      memo,
      settled: false
    };
    
    // Add stream to channel
    channel.streams.push(stream);
    this.channels.set(channelId, channel);
    this.streams.set(streamId, stream);
    
    // Start streaming simulation
    this.simulateStreaming(stream, duration);
    
    logger.info(`Stream started: ${streamId}`, {
      channelId,
      recipient,
      amount: totalAmount,
      rate,
      duration
    });
    
    return streamId;
  }

  private simulateStreaming(stream: Stream, duration: number): void {
    const updateInterval = 1000; // Update every second
    const totalUpdates = duration;
    let currentUpdate = 0;
    
    const interval = setInterval(() => {
      currentUpdate++;
      const progress = currentUpdate / totalUpdates;
      const streamedAmount = stream.amount * progress;
      
      // Update stream progress
      const updatedStream = { ...stream, streamedAmount, progress };
      this.streams.set(stream.id, updatedStream);
      
      // Notify WebSocket clients
      if (this.streamingService) {
        this.streamingService.notifyStreamProgress(
          stream.channelId,
          stream.id,
          progress,
          streamedAmount
        );
      }
      
      logger.debug(`Stream progress: ${stream.id}`, {
        progress: `${(progress * 100).toFixed(1)}%`,
        streamed: streamedAmount.toFixed(6)
      });
      
      if (currentUpdate >= totalUpdates) {
        clearInterval(interval);
        this.streamIntervals.delete(stream.id);
        
        // Mark stream as completed
        updatedStream.endTime = Date.now();
        this.streams.set(stream.id, updatedStream);
        
        // Notify WebSocket clients
        if (this.streamingService) {
          this.streamingService.notifyStreamComplete(
            stream.channelId,
            stream.id,
            streamedAmount
          );
        }
        
        logger.info(`Stream completed: ${stream.id}`);
      }
    }, updateInterval);
    
    this.streamIntervals.set(stream.id, interval);
  }

  async settleChannel(channelId: string): Promise<Settlement> {
    const channel = this.channels.get<Channel>(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }
    
    // Stop all active streams
    channel.streams.forEach(stream => {
      const interval = this.streamIntervals.get(stream.id);
      if (interval) {
        clearInterval(interval);
        this.streamIntervals.delete(stream.id);
      }
    });
    
    // Calculate final balances
    const totalStreamed = channel.streams.reduce((total, stream) => {
      const streamData = this.streams.get<any>(stream.id);
      return total + (streamData?.streamedAmount || 0);
    }, 0);
    
    const finalBalances: Record<string, number> = {
      [channel.participant1]: channel.balance - totalStreamed,
      [channel.participant2]: totalStreamed
    };
    
    const settlement: Settlement = {
      channelId,
      finalBalances,
      totalStreamed,
      settledAt: Date.now(),
      txHash: this.generateMockTxHash() // Mock transaction hash
    };
    
    // Update channel status
    channel.status = 'closed';
    channel.settledAt = Date.now();
    this.channels.set(channelId, channel);
    
    logger.info(`Channel settled: ${channelId}`, settlement);
    
    return settlement;
  }

  async getChannelStatus(channelId: string): Promise<any> {
    const channel = this.channels.get<Channel>(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }
    
    // Get current stream statuses
    const streamStatuses = channel.streams.map(stream => {
      const streamData = this.streams.get<any>(stream.id);
      return {
        id: stream.id,
        from: stream.from,
        to: stream.to,
        amount: stream.amount,
        rate: stream.rate,
        progress: streamData?.progress || 0,
        streamedAmount: streamData?.streamedAmount || 0,
        startTime: stream.startTime,
        endTime: stream.endTime,
        active: !stream.endTime && this.streamIntervals.has(stream.id),
        memo: stream.memo
      };
    });
    
    const totalStreamed = streamStatuses.reduce((total, stream) => 
      total + (stream.streamedAmount || 0), 0
    );
    
    return {
      channel: {
        id: channel.id,
        participant1: channel.participant1,
        participant2: channel.participant2,
        initialBalance: channel.balance,
        currentBalance: channel.balance - totalStreamed,
        status: channel.status,
        createdAt: channel.createdAt,
        settledAt: channel.settledAt
      },
      streams: streamStatuses,
      summary: {
        totalStreams: channel.streams.length,
        activeStreams: streamStatuses.filter(s => s.active).length,
        totalStreamed,
        remainingBalance: channel.balance - totalStreamed
      }
    };
  }

  getActiveChannels(): string[] {
    const keys = this.channels.keys();
    return keys.filter(key => {
      const channel = this.channels.get<Channel>(key);
      return channel && channel.status === 'open';
    });
  }

  private generateChannelId(participant1: string, participant2: string): string {
    const combined = [participant1, participant2].sort().join('');
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(combined)).substring(0, 10);
  }

  private generateStreamId(): string {
    return 'stream_' + Math.random().toString(36).substring(2, 15);
  }

  private generateMockTxHash(): string {
    return '0x' + Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }
}