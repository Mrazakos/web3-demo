import { web3Service } from "./web3Service.js";
import { storageService, CONTRACT_ADDRESS } from "./storageService.js";

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

// Helper: truncate 0x1234...5678
function formatAddress(address) {
  if (!address) return "--";
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// Helper: update status text
function setStatus(text, type = "normal") {
  if (!text) {
    statusMessage.textContent = "";
    statusMessage.className = "status hidden";
    return;
  }
  statusMessage.textContent = text;
  statusMessage.className = `status ${type}`;
  statusMessage.classList.remove("hidden");
}

// Display contract address on page load
if (contractAddressDisplay) {
  contractAddressDisplay.textContent = formatAddress(CONTRACT_ADDRESS);
  contractAddressDisplay.title = CONTRACT_ADDRESS;
}

/**
 * Synchronize UI state with current wallet & network status
 */
async function syncUI(account) {
  if (!account) {
    storageService.init(null);
    walletAddressDisplay.textContent = "Not Connected";
    walletBalanceDisplay.textContent = "--";
    connectBtn.textContent = "Connect Wallet";
    submitBtn.disabled = true;
    return;
  }

  // Wallet Connected
  walletAddressDisplay.textContent = formatAddress(account);
  walletAddressDisplay.title = account;
  connectBtn.textContent = formatAddress(account);

  // Initialize storage contract with the active signer
  storageService.init(web3Service.getSigner());

  const balance = await web3Service.getBalance();
  walletBalanceDisplay.textContent = `${balance} ETH`;

  const isCorrect = await web3Service.isCorrectNetwork();
  networkWarning.classList.toggle("hidden", isCorrect);
  submitBtn.disabled = !isCorrect;

  // Read stored value and attach event listener
  await refreshStoredValue();
  storageService.onValueUpdated(({ newValue }) => {
    storedValueDisplay.textContent = newValue;
  });
}

/**
 * Read value from smart contract via StorageService
 */
async function refreshStoredValue() {
  storedValueDisplay.textContent = "Loading...";
  try {
    const val = await storageService.getStoredValue();
    storedValueDisplay.textContent = val;
  } catch (err) {
    console.warn("Could not read stored value:", err.message);
    storedValueDisplay.textContent = "--";
  }
}

/**
 * Handle form submit (contract.set via StorageService)
 */
async function handleUpdateSubmit(e) {
  e.preventDefault();

  const newValue = newValueInput.value.trim();
  if (!newValue) return;

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";

    await storageService.setStoredValue(newValue, (progress) => {
      setStatus(progress, "normal");
    });

    setStatus("Saved successfully to blockchain.", "success");
    newValueInput.value = "";

    await refreshStoredValue();
    const updatedBalance = await web3Service.getBalance();
    walletBalanceDisplay.textContent = `${updatedBalance} ETH`;
  } catch (err) {
    console.error("Update failed:", err);
    setStatus(err.reason || err.message || "Transaction cancelled", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Save";
  }
}

/**
 * Initialize application
 */
async function init() {
  if (!web3Service.hasMetaMask()) {
    connectBtn.textContent = "MetaMask not found";
    connectBtn.onclick = () => window.open("https://metamask.io/download/", "_blank");
    return;
  }

  web3Service.initProvider();

  // Check existing connection on load
  const existingAccount = await web3Service.checkExistingConnection();
  if (existingAccount) {
    await syncUI(existingAccount);
  } else {
    // Attempt fallback read even before wallet is connected
    await refreshStoredValue();
  }

  // Listen to MetaMask account / chain changes
  web3Service.onAccountsChanged(async (account) => {
    await syncUI(account);
  });

  web3Service.onChainChanged(() => {
    window.location.reload();
  });

  // Attach UI listeners
  connectBtn.addEventListener("click", async () => {
    try {
      const account = await web3Service.connectWallet();
      await syncUI(account);
    } catch (err) {
      console.error("Connect failed:", err);
      setStatus("Failed to connect wallet", "error");
    }
  });

  switchNetworkBtn.addEventListener("click", async () => {
    try {
      await web3Service.switchToHardhatNetwork();
    } catch (err) {
      console.error("Switch network failed:", err);
    }
  });

  refreshBtn.addEventListener("click", refreshStoredValue);
  updateForm.addEventListener("submit", handleUpdateSubmit);
}

// Start app
init();
