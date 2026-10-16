import { ethers } from "ethers";

export const HARDHAT_CHAIN_ID = 31337n;
export const HARDHAT_CHAIN_HEX = "0x7a69";
export const LOCAL_RPC_URL = "http://127.0.0.1:8545";

/**
 * Web3Service is strictly responsible for Wallet & Provider communication:
 * - MetaMask detection & Ethers BrowserProvider initialization
 * - Account connection & Signer retrieval
 * - Network verification & switching (Hardhat chain ID 31337)
 * - Balance fetching & MetaMask lifecycle event listeners
 */
export class Web3Service {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.account = null;
  }

  // ==========================================
  // 1. Wallet Detection & Provider Setup
  // ==========================================

  /**
   * Check if MetaMask is available in the browser.
   */
  hasMetaMask() {
    return typeof window !== "undefined" && Boolean(window.ethereum);
  }

  /**
   * Initialize BrowserProvider wrapping window.ethereum.
   */
  initProvider() {
    if (this.hasMetaMask()) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
    }
    return this.provider;
  }

  /**
   * Return the active provider.
   */
  getProvider() {
    return this.provider;
  }

  /**
   * Return the active signer.
   */
  getSigner() {
    return this.signer;
  }

  // ==========================================
  // 2. Network Management
  // ==========================================

  /**
   * Check if the connected network is Hardhat Localhost (Chain ID: 31337).
   */
  async isCorrectNetwork() {
    if (!this.provider) return false;
    try {
      const network = await this.provider.getNetwork();
      return network.chainId === HARDHAT_CHAIN_ID;
    } catch (err) {
      console.error("Failed to detect network:", err);
      return false;
    }
  }

  /**
   * Request MetaMask to switch to Hardhat Localhost (Chain ID: 31337).
   * Automatically adds the network if not already present.
   */
  async switchToHardhatNetwork() {
    if (!this.hasMetaMask()) return;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: HARDHAT_CHAIN_HEX }],
      });
    } catch (switchError) {
      // 4902: Chain not added to MetaMask yet
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: HARDHAT_CHAIN_HEX,
              chainName: "Hardhat Localhost",
              rpcUrls: [LOCAL_RPC_URL],
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  }

  // ==========================================
  // 3. Wallet Connection & Accounts
  // ==========================================

  /**
   * Prompt user to connect their MetaMask wallet (eth_requestAccounts).
   */
  async connectWallet() {
    if (!this.provider) this.initProvider();
    if (!this.provider) throw new Error("MetaMask is not installed.");

    const accounts = await this.provider.send("eth_requestAccounts", []);
    return await this.setupAccount(accounts);
  }

  /**
   * Silently check if an account is already authorized (e.g. after refresh).
   */
  async checkExistingConnection() {
    if (!this.provider) this.initProvider();
    if (!this.provider) return null;

    const accounts = await this.provider.send("eth_accounts", []);
    if (accounts.length > 0) {
      return await this.setupAccount(accounts);
    }
    return null;
  }

  /**
   * Set the active account and signer.
   */
  async setupAccount(accounts) {
    if (!accounts || accounts.length === 0) {
      this.account = null;
      this.signer = null;
      return null;
    }

    this.account = accounts[0];
    this.signer = await this.provider.getSigner();
    return this.account;
  }

  /**
   * Fetch the ETH balance of the connected account formatted to 4 decimals.
   */
  async getBalance() {
    if (!this.account || !this.provider) return "0.0000";
    const balance = await this.provider.getBalance(this.account);
    return parseFloat(ethers.formatEther(balance)).toFixed(4);
  }

  // ==========================================
  // 4. Wallet Lifecycle Listeners
  // ==========================================

  /**
   * Listen for account changes in MetaMask.
   */
  onAccountsChanged(callback) {
    if (!this.hasMetaMask()) return;
    window.ethereum.on("accountsChanged", async (accounts) => {
      const activeAccount = await this.setupAccount(accounts);
      callback(activeAccount);
    });
  }

  /**
   * Listen for network changes in MetaMask.
   */
  onChainChanged(callback) {
    if (!this.hasMetaMask()) return;
    window.ethereum.on("chainChanged", callback);
  }
}

export const web3Service = new Web3Service();
