# Learn2Earn VeChain dApp

A complete educational platform built on VeChain that rewards students with B3TR tokens for completing learning tasks. This dApp integrates with VeBetterDAO's rewards system and uses VeWorld wallet via VeChain Kit for seamless user interaction.

## Features

- 🎓 **Student Registration**: Pay 1 VET to register as a student
- 📝 **Proof Submission**: Submit learning proofs with validation
- ✅ **Moderator Approval**: Backend approval system for submissions
- 🏆 **B3TR Rewards**: Automatic token distribution via VeBetterDAO
- 🔗 **VeWorld Integration**: Seamless wallet connection via VeChain Kit
- 📊 **Transaction Tracking**: Full audit trail with explorer links

## Project Structure

```
Learn2Earn/
├── contracts/
│   └── Learn2Earn.sol          # Main smart contract
├── scripts/
│   ├── deploy.js               # Contract deployment
│   ├── register-app.js         # VeBetterDAO app registration
│   └── update-app-id.js        # Update app configuration
├── src/                        # React frontend
│   ├── components/             # UI components
│   ├── config/                 # Contract configuration
│   └── services/               # API services
├── backend/                    # Express.js backend
│   ├── server.js              # Main server
│   └── contractService.js     # Smart contract integration
└── hardhat.config.cjs         # Hardhat configuration
```

## Quick Start

### 1. Installation

```bash
npm install
```

### 2. Environment Setup

Create a `.env` file:

```env
# VeChain Configuration
VECHAIN_PRIVATE_KEY=your_private_key_here
VITE_CONTRACT_ADDRESS=deployed_contract_address

# Backend Configuration
PORT=3001
MODERATOR_KEY=your-secret-moderator-key-here

# VeBetterDAO Configuration (DO NOT MODIFY)
X2EARN_REWARDS_POOL=0x5F8f86B8D0Fa93cdaE20936d150175dF0205fB38
X2EARN_APPS=0xcB23Eb1bBD5c07553795b9538b1061D0f4ABA153
B3TR_TOKEN=0xbf64cf86894Ee0877C4e7d03936e35Ee8D8b864F
VEBETTERDAO_APP_ID=your_registered_app_id
```

### 3. Contract Deployment

```bash
# Compile contracts
npm run compile

# Deploy to VeChain testnet
npm run deploy:testnet

# Register with VeBetterDAO
npm run register:app

# Update app ID in contract
npm run update:app
```

### 4. Start the Application

```bash
# Start backend server
npm run server

# Start frontend (in another terminal)
npm run dev
```

Visit `http://localhost:3000` to access the dApp.

## User Flow

1. **Connect Wallet**: Connect VeWorld wallet to the dApp
2. **Register**: Pay 1 VET registration fee to become a student
3. **Submit Proof**: Submit learning proof with name and proof link
4. **Wait for Approval**: Moderator reviews and approves submission
5. **Claim Reward**: Receive B3TR tokens automatically via smart contract

## Moderator Approval Process

To approve student submissions, use the following curl commands:

### View All Submissions
```bash
curl http://localhost:3001/api/submissions
```

### Approve a Submission
```bash
curl -X PUT "http://localhost:3001/api/submissions/{WALLET_ADDRESS}/approve" \
  -H "Content-Type: application/json" \
  -H "x-moderator-key: your-secret-moderator-key-here" \
  -d '{"approved": true, "moderatorNotes": "Great submission! Approved for reward."}'
```

### Reject a Submission
```bash
curl -X PUT "http://localhost:3001/api/submissions/{WALLET_ADDRESS}/approve" \
  -H "Content-Type: application/json" \
  -H "x-moderator-key: your-secret-moderator-key-here" \
  -d '{"approved": false, "moderatorNotes": "Please provide more detailed proof."}'
```

**Note**: Replace `{WALLET_ADDRESS}` with the student's wallet address and use the `MODERATOR_KEY` from your `.env` file.

## Smart Contract

The `Learn2Earn.sol` contract handles:

- Student registration with VET payments
- Proof submission storage
- Integration with VeBetterDAO rewards system
- Automatic B3TR token distribution
- Graduate certification system

## VeBetterDAO Integration

This dApp is integrated with VeBetterDAO's X2Earn system:

- **Rewards Pool**: Automatically distributes B3TR tokens
- **App Registration**: Registered as a VeBetterDAO application
- **Sustainability Goals**: Promotes education and learning

## Technology Stack

- **Blockchain**: VeChain Thor
- **Smart Contracts**: Solidity
- **Frontend**: React + Vite
- **Wallet**: VeWorld integration via VeChain Kit
- **Backend**: Node.js + Express
- **Database**: SQLite
- **Deployment**: Hardhat

## Recent Updates

### VeChain Kit Migration

This dApp has been migrated from the legacy VeChain dApp Kit to the new **VeChain Kit** for improved wallet integration and user experience. Key improvements include:

- Enhanced VeWorld wallet connection
- Simplified transaction handling
- Better error handling and user feedback
- More reliable wallet session persistence

## Development

### Prerequisites

- Node.js 18+
- VeWorld wallet extension
- VeChain testnet VET and VTHO tokens

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run server` - Start backend server
- `npm run compile` - Compile smart contracts
- `npm run deploy:testnet` - Deploy to VeChain testnet

## License

MIT License - see LICENSE file for details.