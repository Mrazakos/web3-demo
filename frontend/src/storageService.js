import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./contractData.js";
import { LOCAL_RPC_URL } from "./web3Service.js";

/**
 * StorageService encapsulates all smart contract interactions with SimpleStorage.sol.
 * This separates the contract logic (ABI, methods, events) from the wallet/provider logic.
 */
export class StorageService {
  constructor() {
    this.contract = null;
  }

  /**
   * Initialize the contract instance with a signer (for write + read)
   * or provider (for read-only).
   *
   * @param {ethers.Signer | ethers.Provider} runner
   */
  init(runner) {
    if (runner) {
      this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, runner);
    } else {
      this.contract = null;
    }
  }

  /**
   * Read the stored value from SimpleStorage.sol using contract.get().
   * This is a gasless "view" call.
   * If contract is not yet initialized with a signer, falls back to local JSON-RPC provider.
   */
  async getStoredValue() {
    if (this.contract) {
      return await this.contract.get();
    }

    // Fallback: direct read via local node without requiring a connected wallet
    const fallbackProvider = new ethers.JsonRpcProvider(LOCAL_RPC_URL);
    const readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, fallbackProvider);
    return await readOnlyContract.get();
  }

  /**
   * Update the stored value on-chain by calling contract.set(newValue).
   * Modifies blockchain state, prompts MetaMask for signature & gas,
   * and waits for 1 block confirmation.
   *
   * @param {string} newValue The new value to store
   * @param {function} onStatusUpdate Callback for step-by-step progress
   */
  async setStoredValue(newValue, onStatusUpdate = () => {}) {
    if (!this.contract) {
      throw new Error("Contract is not initialized. Please connect your wallet first.");
    }

    // Step 1: Prompt user for signature in MetaMask
    onStatusUpdate("Please confirm transaction in MetaMask...");
    const tx = await this.contract.set(newValue);

    // Step 2: Broadcasted to local node, waiting for mining
    onStatusUpdate(`Transaction sent (${tx.hash.substring(0, 10)}...). Mining block...`);
    const receipt = await tx.wait(1);

    // Step 3: Transaction confirmed
    onStatusUpdate(`Confirmed in block #${receipt.blockNumber}!`);
    return receipt;
  }

  /**
   * Subscribe to the contract's "ValueUpdated(address indexed updater, string newValue)" event.
   *
   * @param {function} callback Called whenever a new ValueUpdated event is emitted on-chain
   */
  onValueUpdated(callback) {
    if (!this.contract) return;
    this.contract.on("ValueUpdated", (updater, newValue) => {
      callback({ updater, newValue });
    });
  }
}

export const storageService = new StorageService();
export { CONTRACT_ADDRESS };
