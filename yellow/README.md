# Yellow Network Nitrolite Demo

A demonstration implementation of Yellow Network's Nitrolite protocol for state channels and real-time payment streaming using WebSockets.

## Overview

This demo implements core Yellow Network concepts:
- **State Channels**: Off-chain payment channels between participants
- **Payment Streaming**: Real-time token streaming with per-second granularity  
- **Channel Settlement**: Final on-chain settlement of channel balances
- **WebSocket Integration**: Real-time updates for all channel activities

## Features

### 🔗 State Channel Management
- Open payment channels between two participants
- Track channel balances and status
- Support for multiple concurrent streams per channel

### 💧 Payment Streaming
- Real-time token streaming with configurable rates
- Progress tracking with per-second updates
- WebSocket notifications for stream events

### 📊 Real-time Updates
- Live progress tracking via WebSockets
- Channel status monitoring
- Settlement notifications

### 🛠 Admin Interface
- Server statistics and monitoring
- Connection status tracking
- Logging and debugging tools

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm run dev
# Server runs on http://localhost:4002
# WebSocket endpoint: ws://localhost:4002
```

### 3. Open Demo Client
Open `demo/client.html` in your browser to interact with the demo.

### 4. Test the Flow
1. **Connect**: Click "Connect to WebSocket"
2. **Open Channel**: Set participants and initial balance, click "Open Channel" 
3. **Start Stream**: Use the returned channel ID to start a payment stream
4. **Watch Progress**: See real-time streaming progress via WebSocket
5. **Settle**: Click "Settle Channel" to finalize balances

## API Endpoints

### Channel Management
- `POST /api/channel/open` - Open a new payment channel
- `GET /api/channel/:id/status` - Get current channel status
- `POST /api/channel/:id/settle` - Settle and close channel

### Streaming  
- `POST /api/channel/:id/stream` - Start a new payment stream

### Admin
- `GET /api/admin/stats` - Server and connection statistics
- `GET /api/admin/logs` - Recent server logs
- `GET /health` - Health check endpoint

## WebSocket Events

### Client → Server
```typescript
// Subscribe to channel updates
{ type: 'subscribe', channelId: '0x1234...' }

// Unsubscribe from channel
{ type: 'unsubscribe', channelId: '0x1234...' }

// Heartbeat ping
{ type: 'ping' }
```

### Server → Client
```typescript
// Welcome message on connection
{ type: 'welcome', message: string, timestamp: number }

// Stream started notification
{ 
  type: 'stream_started', 
  channelId: string, 
  streamId: string, 
  details: object 
}

// Real-time streaming progress  
{ 
  type: 'stream_progress',
  channelId: string,
  streamId: string, 
  progress: number, // 0.0 to 1.0
  streamedAmount: number 
}

// Stream completion
{ 
  type: 'stream_completed',
  channelId: string, 
  streamId: string,
  finalAmount: number 
}

// Channel settlement
{ 
  type: 'channel_settled',
  channelId: string,
  settlement: object 
}
```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Demo Client   │    │   Express API    │    │  YellowChannel  │
│   (HTML/JS)     │◄──►│   WebSocket      │◄──►│   Service       │
│                 │    │   Server         │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │ StreamingService │    │   Node Cache    │
                       │ (WebSocket Mgmt) │    │  (In-Memory)    │
                       └──────────────────┘    └─────────────────┘
```

## Project Structure

```
yellow/
├── src/
│   ├── server.ts                 # Main Express + WebSocket server
│   ├── services/
│   │   ├── YellowChannel.ts      # Channel management & streaming
│   │   └── StreamingService.ts   # WebSocket client management  
│   └── utils/
│       └── logger.ts             # Logging utility
├── demo/
│   └── client.html               # Interactive demo client
├── package.json
├── tsconfig.json
└── README.md
```

## Implementation Notes

### State Channel Simulation
This is a demo implementation that simulates state channels using in-memory storage. In a production environment:
- Channels would be backed by smart contracts
- State updates would use cryptographic signatures
- Settlement would involve on-chain transactions

### Payment Streaming
- Streams update every second for demonstration
- Progress is calculated as `currentTime / totalDuration`
- WebSocket clients receive real-time progress updates

### WebSocket Management
- Automatic client cleanup for stale connections
- Heartbeat system with 30-second intervals
- Channel subscription system for targeted updates

## Next Steps

To evolve this into a production-ready implementation:

1. **Blockchain Integration**: Connect to actual Yellow Network contracts
2. **Cryptographic Signatures**: Add state channel signature verification  
3. **Persistent Storage**: Replace in-memory cache with database
4. **Security**: Add authentication and rate limiting
5. **Scaling**: Implement horizontal scaling with message queues

## Development

```bash
# Start development server
npm run dev

# Build for production  
npm run build

# Start production server
npm start
```

The demo showcases Yellow Network's core value proposition: instant, low-cost payments through state channels with real-time streaming capabilities.