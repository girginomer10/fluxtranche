import { ethers } from 'ethers';
import { RiskConfig } from '../types';
import { logger } from '../utils/logger';

export class SigningService {
  private wallet: ethers.Wallet;
  private nonce: number = 0;

  constructor() {
    const privateKey = process.env.AI_SIGNER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('AI_SIGNER_PRIVATE_KEY not set');
    }
    this.wallet = new ethers.Wallet(privateKey);
    logger.info('Signing service initialized with address:', this.wallet.address);
  }

  signRiskConfig(config: RiskConfig): string {
    try {
      // Encode the config for signing
      const encoded = this.encodeRiskConfig(config);
      
      // Create message hash
      const messageHash = ethers.utils.keccak256(encoded);
      
      // Sign the message hash
      const signature = this.wallet._signingKey().signDigest(messageHash);
      
      // Return signature in standard format
      const signatureString = ethers.utils.joinSignature(signature);
      
      this.nonce++;
      
      logger.info('Signed risk config', { 
        signer: this.wallet.address,
        nonce: this.nonce - 1,
        signature: signatureString.substring(0, 10) + '...'
      });
      
      return signatureString;
    } catch (error) {
      logger.error('Failed to sign risk config:', error);
      throw new Error('Signing failed');
    }
  }

  verifySignature(config: RiskConfig, signature: string): boolean {
    try {
      const encoded = this.encodeRiskConfig(config);
      const messageHash = ethers.utils.keccak256(encoded);
      const recoveredAddress = ethers.utils.verifyMessage(
        ethers.utils.arrayify(messageHash),
        signature
      );
      
      return recoveredAddress.toLowerCase() === this.wallet.address.toLowerCase();
    } catch (error) {
      logger.error('Signature verification failed:', error);
      return false;
    }
  }

  private encodeRiskConfig(config: RiskConfig): string {
    // Encode the config in a deterministic way for consistent signing
    const encoded = ethers.utils.defaultAbiCoder.encode(
      [
        'uint256', // epochLength
        'uint256', // seniorTargetBps
        'uint256', // maxDrawdownBps
        'uint256', // slippageBps
        'address[]', // strategies
        'uint256[]', // targetWeightsBps
        'uint256[]', // caps
        'uint256' // nonce
      ],
      [
        config.epochLength,
        config.seniorTargetBps,
        config.maxDrawdownBps,
        config.slippageBps,
        config.strategies,
        config.targetWeightsBps,
        config.caps,
        this.nonce
      ]
    );
    
    return encoded;
  }

  getSignerAddress(): string {
    return this.wallet.address;
  }

  getNonce(): number {
    return this.nonce;
  }
}