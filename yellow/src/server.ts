import express from 'express';
import cors from 'cors';
import WebSocket from 'ws';
import http from 'http';
import { YellowChannel } from './services/YellowChannel';
import { StreamingService } from './services/StreamingService';
import { logger } from './utils/logger';

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// Initialize services
const streamingService = new StreamingService(wss);
const yellowChannel = new YellowChannel(streamingService);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Yellow Nitrolite Demo',
    timestamp: new Date().toISOString()
  });
});

// Channel endpoints
app.post('/api/channel/open', async (req, res) => {
  try {
    const { participant1, participant2, initialBalance } = req.body;
    const channelId = await yellowChannel.openChannel(participant1, participant2, initialBalance);
    
    res.json({
      channelId,
      status: 'opened',
      participants: [participant1, participant2],
      balance: initialBalance
    });
  } catch (error) {
    logger.error('Failed to open channel:', error);
    res.status(500).json({ error: 'Failed to open channel' });
  }
});

app.post('/api/channel/:channelId/stream', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { recipient, amount, memo } = req.body;
    
    const streamId = await yellowChannel.startStream(channelId, recipient, amount, memo);
    
    // Notify WebSocket clients
    streamingService.notifyStreamStart(channelId, streamId, { recipient, amount, memo });
    
    res.json({
      streamId,
      channelId,
      status: 'streaming',
      recipient,
      amount,
      memo
    });
  } catch (error) {
    logger.error('Failed to start stream:', error);
    res.status(500).json({ error: 'Failed to start stream' });
  }
});

app.post('/api/channel/:channelId/settle', async (req, res) => {
  try {
    const { channelId } = req.params;
    const settlement = await yellowChannel.settleChannel(channelId);
    
    // Notify WebSocket clients
    streamingService.notifySettlement(channelId, settlement);
    
    res.json({
      channelId,
      status: 'settled',
      settlement
    });
  } catch (error) {
    logger.error('Failed to settle channel:', error);
    res.status(500).json({ error: 'Failed to settle channel' });
  }
});

app.get('/api/channel/:channelId/status', async (req, res) => {
  try {
    const { channelId } = req.params;
    const status = await yellowChannel.getChannelStatus(channelId);
    
    res.json(status);
  } catch (error) {
    logger.error('Failed to get channel status:', error);
    res.status(500).json({ error: 'Channel not found' });
  }
});

// Admin endpoints
app.get('/api/admin/stats', (req, res) => {
  const streamingStats = streamingService.getStats();
  const activeChannels = yellowChannel.getActiveChannels();
  
  res.json({
    streaming: streamingStats,
    channels: {
      active: activeChannels.length,
      activeIds: activeChannels
    },
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: Date.now()
    }
  });
});

app.get('/api/admin/logs', (req, res) => {
  const count = parseInt(req.query.count as string) || 100;
  const level = req.query.level as any;
  
  const logs = level ? logger.getLogs(level) : logger.getRecentLogs(count);
  
  res.json({
    logs,
    totalCount: logs.length,
    level: level || 'all'
  });
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  logger.info('New WebSocket connection');
  
  // Register client with streaming service
  streamingService.addClient(ws);
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      streamingService.handleMessage(ws, data);
    } catch (error) {
      logger.error('Invalid WebSocket message:', error);
      ws.send(JSON.stringify({ error: 'Invalid message format' }));
    }
  });
  
  ws.on('close', () => {
    logger.info('WebSocket connection closed');
    streamingService.removeClient(ws);
  });
  
  ws.on('error', (error) => {
    logger.error('WebSocket error:', error);
    streamingService.removeClient(ws);
  });
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to Yellow Nitrolite Demo',
    timestamp: Date.now()
  }));
});

const PORT = process.env.YELLOW_CHANNEL_PORT || 4002;

server.listen(PORT, () => {
  logger.info(`Yellow Nitrolite Demo server running on port ${PORT}`);
  logger.info(`WebSocket endpoint: ws://localhost:${PORT}`);
});

export default app;