import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./contractData.js";

const HARDHAT_CHAIN_ID = 31337n;
const HARDHAT_CHAIN_HEX = "0x7a69";

// State
let provider = null;
let signer = null;
let contract = null;
let currentAccount = null;
let isCorrectNetwork = false;

// DOM Elements
const connectBtn = document.getElementById("connectBtn");
const networkWarning = document.getElementById("networkWarning");
const switchNetworkBtn = document.getElementById("switchNetworkBtn");
const storedValueDisplay = document.getElementById("storedValueDisplay");
const refreshBtn = document.getElementById("refreshBtn");
const updateForm = document.getElementById("updateForm");
const newValueInput = document.getElementById("newValueInput");
const submitBtn = document.getElementById("submitBtn");
const statusMessage = document.getElementById("statusMessage");
const contractAddressDisplay = document.getElementById("contractAddressDisplay");
const walletAddressDisplay = document.getElementById("walletAddressDisplay");
const walletBalanceDisplay = document.getElementById("walletBalanceDisplay");

// Helper: truncate address
function formatAddress(address) {
  if (!address) return "--";
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// Display contract address
if (contractAddressDisplay) {
  contractAddressDisplay.textContent = formatAddress(CONTRACT_ADDRESS);
  contractAddressDisplay.title = CONTRACT_ADDRESS;
}

// Helper: set status message
function setStatus(text, type = "normal") {
  if (!statusMessage) return;
  if (!text) {
    statusMessage.textContent = "";
    statusMessage.className = "status hidden";
    return;
  }
  statusMessage.textContent = text;
  statusMessage.className = `status ${type}`;
  statusMessage.classList.remove("hidden");
}

// Check MetaMask availability
function hasMetaMask() {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

// Initialize application
async function init() {
  if (!hasMetaMask()) {
    connectBtn.textContent = "MetaMask not found";
    connectBtn.onclick = () => window.open("https://metamask.io/download/", "_blank");
    return;
  }

  provider = new ethers.BrowserProvider(window.ethereum);

  await checkNetwork();

  try {
    const accounts = await provider.send("eth_accounts", []);
    if (accounts.length > 0) {
      await handleAccountsChanged(accounts);
    } else {
      // Wallet not connected yet, but try reading via local provider
      await readStoredValue();
    }
  } catch (err) {
    console.error("Auto-connect check failed:", err);
  }

  window.ethereum.on("accountsChanged", handleAccountsChanged);
  window.ethereum.on("chainChanged", () => window.location.reload());
}

// Check network
async function checkNetwork() {
  if (!provider) return;
  try {
    const network = await provider.getNetwork();
    if (network.chainId === HARDHAT_CHAIN_ID) {
      isCorrectNetwork = true;
      networkWarning.classList.add("hidden");
    } else {
      isCorrectNetwork = false;
      networkWarning.classList.remove("hidden");
    }
  } catch (err) {
    console.error("Network check failed:", err);
  }
}

// Switch to Hardhat Localhost
async function switchNetwork() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: HARDHAT_CHAIN_HEX }],
    });
  } catch (err) {
    if (err.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: HARDHAT_CHAIN_HEX,
              chainName: "Hardhat Localhost",
              rpcUrls: ["http://127.0.0.1:8545"],
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            },
          ],
        });
      } catch (addErr) {
        console.error("Failed to add network:", addErr);
      }
    } else {
      console.error("Failed to switch network:", err);
    }
  }
}

// Connect MetaMask
async function connectWallet() {
  if (!hasMetaMask()) return;
  try {
    connectBtn.disabled = true;
    connectBtn.textContent = "Connecting...";
    const accounts = await provider.send("eth_requestAccounts", []);
    await handleAccountsChanged(accounts);
  } catch (err) {
    console.error("Connection failed:", err);
    setStatus("Failed to connect wallet", "error");
  } finally {
    connectBtn.disabled = false;
  }
}

// Handle account change
async function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    currentAccount = null;
    signer = null;
    contract = null;
    walletAddressDisplay.textContent = "Not Connected";
    walletBalanceDisplay.textContent = "--";
    connectBtn.textContent = "Connect Wallet";
    submitBtn.disabled = true;
    return;
  }

  currentAccount = accounts[0];
  signer = await provider.getSigner();

  walletAddressDisplay.textContent = formatAddress(currentAccount);
  walletAddressDisplay.title = currentAccount;
  connectBtn.textContent = formatAddress(currentAccount);

  await updateBalance();
  await checkNetwork();

  contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  submitBtn.disabled = !isCorrectNetwork;

  await readStoredValue();
  setupEventListener();
}

// Update balance
async function updateBalance() {
  if (!currentAccount || !provider) return;
  try {
    const balance = await provider.getBalance(currentAccount);
    walletBalanceDisplay.textContent = `${parseFloat(ethers.formatEther(balance)).toFixed(4)} ETH`;
  } catch (err) {
    console.error("Balance fetch error:", err);
  }
}

// Read value from contract
async function readStoredValue() {
  storedValueDisplay.textContent = "Loading...";

  try {
    if (contract) {
      const val = await contract.get();
      storedValueDisplay.textContent = val;
    } else {
      // Direct JSON-RPC fallback if wallet not yet connected
      const readProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readProvider);
      const val = await readContract.get();
      storedValueDisplay.textContent = val;
    }
  } catch (err) {
    console.warn("Read error (node may be offline):", err.message);
    storedValueDisplay.textContent = "--";
  }
}

// Update value on blockchain
async function updateStoredValue(e) {
  e.preventDefault();

  const newValue = newValueInput.value.trim();
  if (!newValue) return;

  if (!contract || !signer) {
    setStatus("Please connect your wallet first.", "error");
    return;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";
    setStatus("Confirm transaction in MetaMask...", "normal");

    const tx = await contract.set(newValue);
    setStatus(`Transaction sent (${formatAddress(tx.hash)}). Mining...`, "normal");

    await tx.wait(1);
    setStatus("Saved successfully to blockchain.", "success");
    newValueInput.value = "";

    await readStoredValue();
    await updateBalance();
  } catch (err) {
    console.error("Update error:", err);
    setStatus(err.reason || err.message || "Transaction rejected", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Save";
  }
}

// Real-time event listener
let isListening = false;
function setupEventListener() {
  if (!contract || isListening) return;

  try {
    contract.on("ValueUpdated", (_updater, newValue) => {
      storedValueDisplay.textContent = newValue;
    });
    isListening = true;
  } catch (err) {
    console.error("Event listener error:", err);
  }
}

// Bind events
connectBtn.addEventListener("click", connectWallet);
switchNetworkBtn.addEventListener("click", switchNetwork);
refreshBtn.addEventListener("click", readStoredValue);
updateForm.addEventListener("submit", updateStoredValue);

init();
