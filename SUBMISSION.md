# FluxTranche - ETHIstanbul 2025 Submission

## 🚀 Project Overview
FluxTranche is an AI-powered DeFi vault system that brings institutional-grade structured products to RISE Chain with mobile-first design and Account Abstraction.

## 🔗 Links
- **GitHub Repository**: https://github.com/girginomer10/fluxtranche
- **Live Demo**: http://localhost:3000/dashboard
- **RISE Testnet Explorer**: https://explorer.testnet.riselabs.xyz

## 🎯 Key Features

### 1. AI Risk Engine (Gemini 2.0 Pro)
- Real-time market analysis
- Dynamic risk scoring
- Automated rebalancing decisions
- Multi-factor risk assessment

### 2. Senior/Junior Tranches
- Capital protection for Senior tranche
- Enhanced returns for Junior tranche  
- Dynamic waterfall distribution
- Automated yield optimization

### 3. Account Abstraction & Passkeys
- One-click transactions with passkeys
- Session keys for gas-free operations
- Mobile-first authentication
- No seed phrases required

### 4. Advanced Protection Strategies
- **CPPI Autopilot**: Floor protection with dynamic multiplier
- **Drawdown Shield**: Automatic protection on >X% losses
- **Flash Epochs**: Quick in-and-out liquidity provision
- **Defined Outcome Series**: Known upside/downside at maturity

## 🏗️ Technical Architecture

### Smart Contracts (Solidity 0.8.24)
- `TrancheVault.sol` - Main vault with Senior/Junior tranches
- `CPPIAutopilot.sol` - CPPI strategy implementation
- `DrawdownShield.sol` - Drawdown protection mechanism
- `GasSponsorManager.sol` - Gas abstraction with passkeys
- `DefinedOutcomeSeries.sol` - Structured products

### Backend Services
- **AI Risk Engine** - Gemini 2.0 Pro integration
- **Keeper Service** - Automated epoch management
- **Market Data Service** - Real-time price feeds

### Frontend (Next.js 15.5.2)
- TypeScript + Tailwind CSS
- Mobile-responsive design
- Real-time portfolio tracking
- Multi-wallet support (manual tracking)

## 🌐 RISE Chain Integration

### Network Details
- **Chain ID**: 11155931
- **RPC URL**: https://testnet.riselabs.xyz
- **Explorer**: https://explorer.testnet.riselabs.xyz

### Account Abstraction Features
- Passkey authentication (WebAuthn)
- Session keys for transaction batching
- Gas sponsorship for users
- Social recovery mechanisms

## 📊 Risk Management

### AI-Powered Decision Making
```typescript
// Risk assessment factors
- Market volatility (30%)
- Liquidity depth (25%)
- Historical performance (20%)
- Correlation analysis (15%)
- Sentiment analysis (10%)
```

### Protection Mechanisms
1. **Dynamic Rebalancing** - Based on AI recommendations
2. **Stop-Loss Triggers** - Automatic position closure
3. **Hedging Strategies** - Options overlay when needed
4. **Capital Preservation** - Senior tranche always protected

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Foundry
- Git

### Installation
```bash
git clone https://github.com/girginomer10/fluxtranche.git
cd fluxtranche

# Install frontend dependencies
cd frontend
npm install
npm run dev

# Frontend will be available at http://localhost:3000
```

### Access Dashboard
Navigate to: http://localhost:3000/dashboard

## 🎮 Demo Features

### Try These Features:
1. **Portfolio Dashboard** - Track multiple wallets
2. **CPPI Autopilot** - Set floor value and multiplier
3. **Drawdown Shield** - Configure protection threshold
4. **AI Decision Viewer** - See real-time AI analysis
5. **Epoch Management** - Deposit/withdraw in epochs

## 🏆 Hackathon Highlights

### Innovation
- First DeFi protocol on RISE with AI risk management
- Novel use of passkeys for DeFi interactions
- Mobile-first design for mass adoption

### Technical Excellence
- Clean architecture with modular contracts
- Comprehensive test coverage
- Gas-optimized implementations
- Production-ready codebase

### Impact
- Makes DeFi accessible to retail users
- Institutional-grade risk management
- No technical knowledge required
- One-click investment strategies

## 👥 Team
- **Developer**: Omer Girgin
- **Contact**: GitHub @girginomer10

## 📝 License
MIT License - Open source for the community

---

**Built with ❤️ for ETHIstanbul 2025**