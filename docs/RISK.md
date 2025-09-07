# FluxTranche Risk Analysis

## Executive Summary

FluxTranche implements multiple layers of risk management to protect user funds while maintaining capital efficiency. This document outlines potential risks and mitigation strategies.

## Risk Categories

### 1. Smart Contract Risks

#### Reentrancy Attacks
- **Risk**: External calls during state changes
- **Mitigation**: 
  - OpenZeppelin ReentrancyGuard on all public functions
  - Checks-Effects-Interactions pattern
  - State updates before external calls

#### Integer Overflow/Underflow
- **Risk**: Arithmetic errors in calculations
- **Mitigation**:
  - Solidity 0.8.24 built-in overflow protection
  - SafeMath for critical calculations
  - Explicit bounds checking

#### Access Control
- **Risk**: Unauthorized function calls
- **Mitigation**:
  - Role-based access control (RBAC)
  - Multi-signature requirements for critical functions
  - Timelock for parameter changes

### 2. Oracle Risks

#### Price Manipulation
- **Risk**: Flash loan attacks on price feeds
- **Mitigation**:
  - Dual-oracle system (DEX TWAP + Reference)
  - Deviation threshold checks (5% default)
  - Time-weighted average prices (TWAP)
  - Settlement delays to prevent same-block manipulation

#### Oracle Failure
- **Risk**: Oracle downtime or malfunction
- **Mitigation**:
  - Fallback oracle sources
  - Circuit breakers on extreme deviations
  - Manual override capability (Guardian)

### 3. Economic Risks

#### Bank Run Scenario
- **Risk**: Mass withdrawals depleting liquidity
- **Mitigation**:
  - Withdrawal queue mechanism (optional)
  - Epoch-based settlement reducing frequency
  - Reserve requirements
  - Progressive withdrawal fees (future)

#### Strategy Losses
- **Risk**: Underlying strategy failures
- **Mitigation**:
  - Diversification across strategies
  - Position limits per strategy
  - Risk-based capital allocation
  - Junior tranche absorbs losses first

#### Interest Rate Risk
- **Risk**: Senior coupon obligations during low yields
- **Mitigation**:
  - Dynamic coupon adjustment via AI
  - Reserve fund for coupon smoothing
  - Junior buffer for payment coverage

### 4. Operational Risks

#### Keeper Failure
- **Risk**: Missed epoch settlements
- **Mitigation**:
  - Multiple keeper instances
  - Public settlement functions (anyone can call)
  - Monitoring and alerting
  - Incentive mechanisms for external callers

#### AI Model Risk
- **Risk**: Incorrect parameter generation
- **Mitigation**:
  - Parameter bounds and sanity checks
  - 24-hour timelock for review
  - Guardian override capability
  - Historical backtesting validation

### 5. Governance Risks

#### Parameter Manipulation
- **Risk**: Malicious parameter updates
- **Mitigation**:
  - Multi-signature requirement
  - Timelock delays
  - Community review period
  - Immutable core logic

#### Centralization
- **Risk**: Single points of failure
- **Mitigation**:
  - Progressive decentralization roadmap
  - Multiple guardian addresses
  - Open-source codebase
  - Permissionless settlement functions

## Risk Parameters

### Default Configuration

```solidity
// Risk Limits
MAX_DRAWDOWN_BPS = 2000;      // 20% maximum drawdown
MIN_EPOCH_LENGTH = 1 days;     // Minimum epoch duration
MAX_EPOCH_LENGTH = 30 days;    // Maximum epoch duration
DEVIATION_THRESHOLD = 500;     // 5% oracle deviation

// Tranche Limits
SENIOR_CAP = 10_000_000e6;     // $10M senior cap
JUNIOR_MIN_RATIO = 2000;       // 20% minimum junior buffer
MAX_LEVERAGE = 300;             // 3x maximum leverage

// Timelock
TIMELOCK_DELAY = 24 hours;     // Parameter update delay
EMERGENCY_DELAY = 2 hours;     // Emergency action delay
```

### Dynamic Adjustments

The AI Risk Engine adjusts parameters based on:

1. **Market Volatility**
   - Higher vol → Lower senior target
   - Higher vol → Increased junior buffer

2. **Liquidity Conditions**
   - Low liquidity → Reduced position sizes
   - Low liquidity → Wider deviation thresholds

3. **Correlation Risk**
   - High correlation → More diversification
   - High correlation → Lower leverage

## Threat Model

### Attack Vectors

1. **Flash Loan Attack**
   - Vector: Manipulate prices within single block
   - Defense: TWAP oracles, same-block restrictions

2. **Sandwich Attack**
   - Vector: Front/back-run large deposits
   - Defense: Commitment-reveal scheme (future)

3. **Grief Attack**
   - Vector: DOS via excessive small operations
   - Defense: Minimum amounts, gas limits

4. **Vampire Attack**
   - Vector: Drain liquidity to competing protocol
   - Defense: Withdrawal fees, loyalty rewards (future)

### Risk Matrix

| Risk | Likelihood | Impact | Mitigation Strength |
|------|------------|--------|-------------------|
| Smart Contract Bug | Low | Critical | High |
| Oracle Manipulation | Medium | High | High |
| Strategy Loss | Medium | Medium | Medium |
| Keeper Failure | Low | Low | High |
| Bank Run | Low | High | Medium |
| AI Miscalculation | Low | Medium | High |

## Emergency Procedures

### Pause Mechanism

```solidity
// Guardian can pause in emergency
guardian.pauseDeposits();
// Withdrawals remain available
vault.withdraw(amount, receiver, owner);
```

### Emergency Withdrawal

1. Guardian initiates emergency mode
2. All strategies recalled to vault
3. Pro-rata distribution to all holders
4. No waterfall/fee calculations

### Incident Response

1. **Detection**: Monitoring alerts trigger
2. **Assessment**: Team evaluates severity
3. **Response**: Execute emergency procedures
4. **Communication**: Notify users via all channels
5. **Post-Mortem**: Public report and fixes

## Insurance Considerations

### Coverage Options (Future)

1. **Protocol Insurance**
   - Smart contract coverage via Nexus Mutual
   - Oracle insurance via Chainlink
   
2. **User Insurance**
   - Optional insurance for deposits
   - Senior tranche implicit insurance via Junior

3. **Reserve Fund**
   - Protocol fees accumulate reserves
   - Emergency fund for black swan events

## Audit Requirements

### Pre-Launch (Hackathon)
- [x] Internal review
- [x] Foundry test coverage
- [x] Slither static analysis
- [ ] Community review

### Post-Hackathon
- [ ] Professional audit firm
- [ ] Formal verification
- [ ] Bug bounty program
- [ ] Immunefi listing

## Risk Disclosure

### User Acknowledgments

Users must understand:
1. **Total Loss Risk**: All deposited funds can be lost
2. **Smart Contract Risk**: Code may contain bugs
3. **No Insurance**: No deposit insurance exists
4. **Experimental**: This is experimental technology
5. **Not Financial Advice**: No investment recommendations

### Legal Disclaimer

```
THIS SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, 
EXPRESS OR IMPLIED. IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR 
ANY CLAIM, DAMAGES OR OTHER LIABILITY. USE AT YOUR OWN RISK.

NOT FINANCIAL ADVICE. NOT AUDITED. EXPERIMENTAL SOFTWARE.
MAY CONTAIN BUGS. YOU MAY LOSE ALL YOUR FUNDS.
```

## Monitoring & Alerts

### Key Metrics

Monitor continuously:
- TVL changes > 20% in 1 hour
- Oracle deviation > 3%
- Strategy losses > 5%
- Gas price spikes > 10x
- Keeper heartbeat miss > 30 min

### Alert Channels

1. **Critical**: PagerDuty → Team
2. **High**: Discord webhook → Channel
3. **Medium**: Email → Team
4. **Low**: Dashboard notification

## Future Improvements

### Short Term (3 months)
- [ ] Chainlink price feeds integration
- [ ] Formal verification of core logic
- [ ] Insurance fund implementation
- [ ] Multi-chain oracle aggregation

### Medium Term (6 months)
- [ ] Decentralized keeper network
- [ ] On-chain AI model verification
- [ ] Cross-chain risk correlation
- [ ] Automated incident response

### Long Term (12 months)
- [ ] Full DAO governance
- [ ] Permissionless strategy creation
- [ ] Risk tokenization marketplace
- [ ] Institutional grade compliance