# 🌐 Web3 dApp Demo: Hardhat + Smart Contract + MetaMask

A complete, beginner-friendly Web3 demo designed for presentations, university lectures, and workshops. It showcases:
1. **Hardhat**: Development environment, compiler, and automated testing.
2. **Local Blockchain**: Running an Ethereum node locally (`http://127.0.0.1:8545`).
3. **Smart Contract**: `SimpleStorage.sol` with state variables, `get()` view function, `set()` state-changing transaction, and `ValueUpdated` event.
4. **Automated Export**: Deployment script automatically extracts the contract address and ABI into the frontend.
5. **Frontend dApp**: Modern UI built with Vite + Ethers v6 connecting to MetaMask, reading on-chain data with 0 gas, sending transactions, and streaming events in real time.

---

## 🏗️ Architecture

```
                       ┌────────────────────────────────────────┐
                       │          Browser (User / Client)       │
                       │                                        │
                       │  ┌──────────────┐   ┌───────────────┐  │
                       │  │   MetaMask   │   │ Vite Frontend │  │
                       │  │ (Signer/Key) │◄─►│ (Ethers.js v6)│  │
                       │  └──────┬───────┘   └───────┬───────┘  │
                       └─────────┼───────────────────┼──────────┘
                                 │                   │
                                 │ RPC Calls         │ Read / Event Calls
                                 │ (signed txs)      │
                                 ▼                   ▼
                       ┌────────────────────────────────────────┐
                       │     Local Hardhat Node (Chain 31337)   │
                       │          http://127.0.0.1:8545         │
                       │                                        │
                       │         [ SimpleStorage.sol ]          │
                       │         - get() [view, free]           │
                       │         - set() [gas, state change]    │
                       │         - event ValueUpdated           │
                       └────────────────────────────────────────┘
```

---

## ⚡ Quickstart Guide

### 1. Install Dependencies
Run in the root directory:
```bash
npm install
cd frontend && npm install && cd ..
```

### 2. Run Automated Tests
Verify that the smart contract compiles and passes all unit tests:
```bash
npm test
```

### 3. Start Local Hardhat Node
In a dedicated terminal window, start your local blockchain node:
```bash
npx hardhat node
```
> [!NOTE]
> This command spins up a local Ethereum JSON-RPC node at `http://127.0.0.1:8545` and prints **20 test accounts** pre-funded with 10,000 ETH each. **Keep this terminal running!**

### 4. Deploy Smart Contract to Local Node
In a **new terminal window**, deploy the contract:
```bash
npm run deploy
```
*(Or: `npx hardhat run scripts/deploy.js --network localhost`)*

You will see:
- Deployer address and initial ETH balance
- Deployed contract address (e.g. `0x5FbDB2315678afecb367f032d93F642f64180aa3`)
- Confirmation that ABI and address were exported to `frontend/src/contractData.js`

### 5. Start the Frontend
In the root directory, run:
```bash
npm run dev
```
Open the browser at `http://localhost:5173`.

---

## 🦊 MetaMask Configuration

To interact with your local blockchain, configure MetaMask:

### Step A: Add Hardhat Localhost Network
1. Click the network selector dropdown in MetaMask (top-left).
2. Click **"Add a network"** -> **"Add a network manually"**.
3. Enter the following details:
   - **Network Name:** `Hardhat Localhost`
   - **New RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `31337`
   - **Currency Symbol:** `ETH`
4. Click **Save** and switch to this network.

*(Note: The frontend also features an automatic **"Switch Network"** button that prompts MetaMask to add/switch to this network automatically!)*

### Step B: Import a Test Account
1. In the terminal running `npx hardhat node`, locate **Account #0**.
2. Copy its **Private Key**:
   ```
   0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```
3. In MetaMask, click your account avatar -> **"Add account or hardware wallet"** -> **"Import account"**.
4. Paste the private key and click **Import**.
5. You should now see an account with **~10,000 ETH**!

---

## 🎬 How to Present the Demo

1. **Explain the Smart Contract (`contracts/SimpleStorage.sol`)**:
   - Point out `storedValue` (state variable stored on the blockchain).
   - Show `get()` marked as `view` (read-only, does not modify state, free / 0 gas).
   - Show `set(newValue)` (modifies state, requires a transaction signed by a private key, consumes gas).
   - Show `emit ValueUpdated(...)` (event logged into the block receipt, useful for real-time frontend updates).

2. **Demonstrate Automated Testing (`test/SimpleStorage.test.js`)**:
   - Run `npx hardhat test` to show how developers verify logic locally before deploying.

3. **Demonstrate Node & Deployment**:
   - Show `npx hardhat node` creating blocks and generating pre-funded accounts.
   - Run `npm run deploy` to show deployment transaction being mined.

4. **Demonstrate Frontend Interaction**:
   - Open `http://localhost:5173`.
   - Click **Connect MetaMask** and approve the connection.
   - Point out the read section: it shows `"Hello, Hardhat & Web3!"` without needing any gas.
   - Enter a new message (e.g., `"Decentralized apps are awesome!"`) or click one of the preset chips.
   - Click **Submit to Blockchain (set)**.
   - Show the MetaMask popup requesting signature and gas approval.
   - Confirm the transaction.
   - Observe the live node terminal: it prints the `eth_sendRawTransaction`, block mining, and gas used!
   - Observe the frontend: the stored value updates, and a new event appears in the **Live Contract Events** panel.

---

## 💡 Troubleshooting & Tips

### Issue: "Nonce too high" or transaction stuck
- **Why it happens:** If you restart `npx hardhat node`, the local blockchain resets to block #0 and nonces reset to 0. MetaMask still remembers past transaction nonces from previous node runs.
- **Fix:** In MetaMask, go to **Settings** -> **Advanced** -> Click **"Clear activity tab data"** (or "Reset account"). This clears MetaMask's local nonce cache.

### Issue: "Cannot read properties / Node offline"
- **Fix:** Make sure `npx hardhat node` is currently running and you have run `npm run deploy` at least once.
