#!/bin/bash

# RISE Testnet Deployment Script
# =================================

echo "🚀 FluxTranche RISE Testnet Deployment"
echo "======================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
fi

# Prompt for private key if not set
if ! grep -q "PRIVATE_KEY=" .env || grep -q "PRIVATE_KEY=$" .env || grep -q "PRIVATE_KEY=\"\"" .env; then
    echo "🔑 Please enter your private key (with 0x prefix):"
    read -s PRIVATE_KEY
    echo ""
    
    # Update .env file with private key
    if grep -q "PRIVATE_KEY=" .env; then
        sed -i '' "s/PRIVATE_KEY=.*/PRIVATE_KEY=\"$PRIVATE_KEY\"/" .env
    else
        echo "PRIVATE_KEY=\"$PRIVATE_KEY\"" >> .env
    fi
    echo "✅ Private key saved to .env"
else
    echo "✅ Private key already configured"
fi

# Set RISE RPC URL
export RISE_RPC_URL="https://testnet.riselabs.xyz"
echo "🌐 RISE RPC URL: $RISE_RPC_URL"
echo ""

# Build contracts
echo "📦 Building smart contracts..."
forge build --contracts contracts/src/TrancheVault.sol
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi
echo "✅ Contracts built successfully"
echo ""

# Deploy to RISE testnet
echo "🚀 Deploying to RISE Testnet..."
echo "Chain ID: 11155931"
echo "RPC: $RISE_RPC_URL"
echo ""

# Run deployment script
forge script contracts/script/DeployRise.s.sol:DeployRise \
    --rpc-url $RISE_RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --verify \
    --verifier blockscout \
    --verifier-url https://explorer.testnet.riselabs.xyz/api \
    -vvvv

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Check the deployment on RISE Explorer: https://explorer.testnet.riselabs.xyz"
    echo "2. Save the deployed contract addresses"
    echo "3. Update frontend configuration with new addresses"
    echo ""
else
    echo ""
    echo "❌ Deployment failed. Please check the error messages above."
    echo ""
    echo "Common issues:"
    echo "- Insufficient ETH balance (get test ETH from: https://faucet.testnet.riselabs.xyz)"
    echo "- Invalid private key format"
    echo "- Network connectivity issues"
fi