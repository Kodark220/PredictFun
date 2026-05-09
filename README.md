# MemeSurvivor DApp

A decentralized prediction market where users bet on whether a meme token will **"survive"** a given time duration. Bets are placed on **Base Sepolia** (EVM), and outcomes are resolved by a **GenLayer Intelligent Contract** that fetches live DexScreener data and uses AI consensus to determine survival.

## Components

1. **Frontend**: A premium dark-mode, glassmorphic UI built with Vite, React, shadcn/ui, Tailwind CSS, and Framer Motion.
2. **EVM Contract**: A Solidity contract deployed on Base Sepolia handling escrow and payouts.
3. **GenLayer Contract**: An Intelligent Contract (`MemeSurvivorIC.py`) deployed on the GenLayer network to fetch live market data and resolve bets using AI consensus.

## Network Details

### Base Sepolia
- **RPC**: `https://sepolia.base.org`
- **Chain ID**: `84532`
- **Explorer**: [https://sepolia.basescan.org](https://sepolia.basescan.org)

### GenLayer Bradbury Testnet
This project targets the **Bradbury Phase 1** testnet.
- **RPC URL**: `https://studio.genlayer.com:8443/api`
- **Studio Interface**: [studio.genlayer.com](https://studio.genlayer.com)
- **Faucet**: [testnet-faucet.genlayer.foundation](https://testnet-faucet.genlayer.foundation)

## Setup & Deployment

### 1. EVM Contract (Base Sepolia)
```bash
cd contracts/evm
npm install
npx hardhat test
```
To deploy to Base Sepolia:
1. Create a `.env` file with `PRIVATE_KEY` and `BASESCAN_API_KEY`.
2. Run `npx hardhat run scripts/deploy.js --network baseSepolia`
3. Copy the deployed contract address.

### 2. GenLayer Contract (Bradbury)
The Intelligent Contract is located at `contracts/genlayer/MemeSurvivorIC.py`.
1. The contract has been linted and validated with `genvm-linter`.
2. Deploy this contract via the **GenLayer Studio** (connect your wallet to the Bradbury network).
3. Provide the EVM contract address as an initialization argument.

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
1. Open `frontend/src/lib/contract.ts`.
2. Update the `CONTRACT_ADDRESS` constant with your deployed Base Sepolia contract address.
3. The frontend is accessible at `http://localhost:5173`.
