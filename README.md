# FluxTranche - AI-Powered DeFi Yield Vault

> **⚠️ WARNING: Experimental Prototype - Not Financial Advice**  
> This is a hackathon project for ETHIstanbul 2025. Do not use in production or with real funds.

## Overview

FluxTranche is an AI-powered DeFi yield vault protocol with a tranche system (Senior/Junior/Mezzanine) built for the ETHIstanbul 2025 hackathon. It leverages RISE Chain's high throughput and low latency capabilities to create a sophisticated structured product for DeFi users.

### Key Features

- **Tranche System**: Risk-tiered investment options (Senior/Junior tranches)
- **AI Risk Engine**: Dynamic risk management with on-chain parameter updates
- **ERC-4626 Compliant**: Fully composable vault standard
- **Waterfall Distribution**: Senior gets target coupon first, Junior absorbs losses
- **RISE Chain Optimized**: Gas sponsorship, passkey support, session keys
- **Mobile-First UX**: One-click deposits with account abstraction

## Quick Start

### Prerequisites

- Node.js 20+
- Foundry
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/fluxtranche/fluxtranche
cd fluxtranche

# Install dependencies
npm install
cd frontend && npm install && cd ..
cd backend/ai-risk-engine && npm install && cd ../..
cd backend/keeper && npm install && cd ../..

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables

Create `.env` file:

```env
# RISE Testnet
RISE_RPC_URL=https://testnet-rpc.risechain.io
RISE_CHAIN_ID=1380996178
RISE_EXPLORER=https://testnet.explorer.risechain.io

# Deploy Keys (TESTNET ONLY!)
DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
AI_SIGNER_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

# Contract Addresses (after deployment)
TRANCHE_VAULT_ADDRESS=
RISK_PARAMS_ADDRESS=
ORACLE_MANAGER_ADDRESS=

# Frontend
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_ALCHEMY_KEY=optional_for_fallback
```

### Development

```bash
# Run all services
npm run dev

# Or run individually:
npm run dev:contracts  # Foundry watch mode
npm run dev:frontend   # Next.js dev server
npm run dev:ai        # AI Risk Engine
npm run dev:keeper    # Keeper service
```

### Testing

```bash
# Run all tests
npm test

# Individual test suites
npm run test:contracts  # Foundry tests
npm run test:frontend   # Frontend tests
npm run test:backend    # Backend services tests
```

### Deployment

```bash
# Deploy to RISE testnet
npm run deploy

# Verify contracts
forge verify-contract <address> <contract> --chain-id 1380996178
```

## Architecture

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for detailed system design.

### Contract Structure

- `TrancheVault.sol` - Main ERC-4626 vault with epoch management
- `TrancheToken.sol` - ERC-20 tokens for Senior/Junior tranches
- `RiskParams.sol` - AI-signed parameter management with timelock
- `OracleManager.sol` - TWAP and price feed aggregation
- `StrategyRegistry.sol` - Strategy whitelist and limits
- `PauseGuardian.sol` - Emergency controls

### Services

- **AI Risk Engine** - Generates risk parameters and strategy weights
- **Keeper** - Manages epoch settlements and parameter updates
- **Frontend** - Next.js app with RISE Wallet SDK integration

## Hackathon Tracks

This project is designed for multiple ETHIstanbul 2025 tracks:

- ✅ **Blockchain + AI**: AI risk engine with on-chain updates
- ✅ **Real Use Cases**: Risk-appropriate savings product
- ✅ **10 Years of Ethereum**: ERC standards & composability
- ✅ **RISE DeFi 3.0**: High throughput structured products
- ✅ **RISE Open Track**: Mobile-first AA experience
- ✅ **Community Favorite**: Live NAV/epoch UI
- 🔄 **Yellow Network**: Nitrolite state channels (P1)

## Security

See [RISK.md](./docs/RISK.md) for security considerations and risk management.

### Key Security Features

- Reentrancy guards on all critical functions
- Oracle deviation thresholds
- Parameter timelock (24h default)
- Emergency pause mechanism
- Withdrawal queue for large exits
- Same-block manipulation prevention

## Demo

### Local Testing

```bash
# Start local node
anvil --fork-url $RISE_RPC_URL

# Deploy contracts
forge script script/DeployLocal.s.sol --rpc-url http://localhost:8545 --broadcast

# Seed with test data
forge script script/SeedMock.s.sol --rpc-url http://localhost:8545 --broadcast
```

### RISE Testnet Demo

1. Get test tokens from faucet: https://testnet.faucet.risechain.io
2. Visit deployed app: [URL after deployment]
3. Connect wallet with passkey
4. Choose tranche (Senior/Junior)
5. Deposit USDC
6. Monitor epoch progress and AI decisions

## Contributing

This is a hackathon project. Post-hackathon contributions welcome!

## Team

- FluxTranche Team - ETHIstanbul 2025

## License

MIT - See [LICENSE](./LICENSE)

## Disclaimer

**NOT FINANCIAL ADVICE. EXPERIMENTAL PROTOTYPE.**

This software is provided "as is", without warranty of any kind. Use at your own risk. Never use with real funds outside of testnet environments.

## Links

- [Pitch Deck](./docs/PITCH.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Risk Analysis](./docs/RISK.md)
- [RISE Chain Docs](https://docs.risechain.io)
- [Demo Video](https://youtube.com/...)  <!-- Add after recording -->