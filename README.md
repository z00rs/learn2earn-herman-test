# Learn2Earn - VeChain Education Platform

A decentralized education platform built on VeChain that rewards learners with B3TR tokens for completing educational tasks.

## Features

- **VeWorld Wallet Integration**: Seamless connection with VeChain's official wallet
- **Proof Submission**: Students can submit proof of learning completion
- **Moderator Review**: Built-in moderation system for reviewing submissions
- **Automated Rewards**: B3TR token distribution through VeBetterDAO integration
- **Simple UI**: Clean, form-based interface for easy interaction

## Project Structure

```
Learn2Earn/
├── src/                    # Frontend React application
│   ├── components/         # React components
│   ├── services/          # API services
│   └── config/            # Configuration files
├── backend/               # Express.js backend server
│   ├── server.js         # API server
│   └── moderator.html    # Moderator dashboard
├── contracts/            # Smart contracts (Solidity)
└── test/                # Contract tests
```

## Prerequisites

- Node.js v16 or higher
- VeWorld wallet browser extension
- Git

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Learn2Earn
```

2. Checkout the frontend branch:
```bash
git checkout feature/frontend-ui
```

3. Install dependencies:
```bash
npm install
```

4. Create a `.env` file from the example:
```bash
cp .env.example .env
```

5. Update the `.env` file with your configuration:
   - Set `MODERATOR_KEY` to a secure password for the moderator dashboard
   - Get a WalletConnect Project ID from https://cloud.walletconnect.com/
   - Update `REACT_APP_CONTRACT_ADDRESS` once the contract is deployed

## Running the Application

### Development Mode

1. Start the backend server:
```bash
npm run server
```

2. In a new terminal, start the frontend:
```bash
npm run dev
```

3. Open http://localhost:3000 in your browser

### Moderator Dashboard

Access the moderator dashboard at:
```
backend/moderator.html
```

Open this file directly in your browser and use the `MODERATOR_KEY` from your `.env` file to authenticate.

## User Flow

1. **Connect Wallet**: Users connect their VeWorld wallet
2. **Submit Proof**: Fill out the form with name and proof link
3. **Moderator Review**: Moderator reviews and approves submissions
4. **Claim Reward**: Approved users can claim their B3TR tokens

## Smart Contract Deployment

Before using the application, deploy the Learn2Earn.sol contract:

1. Configure the contract with:
   - Institute name
   - X2EarnRewardsPool contract address
   - App ID from VeBetterDAO

2. Update `REACT_APP_CONTRACT_ADDRESS` in `.env` with the deployed address

## Development

### Frontend Technologies
- React 18
- VeChain dApp Kit
- Vite
- Axios

### Backend Technologies
- Express.js
- SQLite3
- CORS

## Security Considerations

- Keep the `MODERATOR_KEY` secure and never commit it to version control
- Validate all user inputs on both frontend and backend
- Use HTTPS in production
- Implement rate limiting for API endpoints
- Regular security audits of the smart contract

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Test thoroughly
4. Create a pull request with a clear description

## License

[Your License Here]

## Support

For issues and questions, please open an issue in the GitHub repository.