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
const connectBtnText = document.getElementById("connectBtnText");
const networkBadge = document.getElementById("networkBadge");
const networkName = document.getElementById("networkName");
const networkWarning = document.getElementById("networkWarning");
const switchNetworkBtn = document.getElementById("switchNetworkBtn");
const contractAddressDisplay = document.getElementById("contractAddressDisplay");
const walletAddressDisplay = document.getElementById("walletAddressDisplay");
const walletBalanceDisplay = document.getElementById("walletBalanceDisplay");
const storedValueDisplay = document.getElementById("storedValueDisplay");
const valueLoading = document.getElementById("valueLoading");
const refreshBtn = document.getElementById("refreshBtn");
const updateForm = document.getElementById("updateForm");
const newValueInput = document.getElementById("newValueInput");
const submitBtn = document.getElementById("submitBtn");
const submitBtnText = document.getElementById("submitBtnText");
const txStatusBox = document.getElementById("txStatusBox");
const txStatusIcon = document.getElementById("txStatusIcon");
const txStatusTitle = document.getElementById("txStatusTitle");
const txStatusMessage = document.getElementById("txStatusMessage");
const eventsList = document.getElementById("eventsList");

// Helper: truncate address
function formatAddress(address) {
  if (!address) return "--";
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// Display contract address immediately
if (contractAddressDisplay) {
  contractAddressDisplay.textContent = formatAddress(CONTRACT_ADDRESS);
  contractAddressDisplay.title = CONTRACT_ADDRESS;
}

// Check MetaMask availability
function hasMetaMask() {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

// Initialize application
async function init() {
  if (!hasMetaMask()) {
    networkBadge.className = "badge badge-network error";
    networkName.textContent = "MetaMask Missing";
    connectBtnText.textContent = "Install MetaMask";
    connectBtn.onclick = () => window.open("https://metamask.io/download/", "_blank");
    return;
  }

  // Setup BrowserProvider using Ethers v6
  provider = new ethers.BrowserProvider(window.ethereum);

  // Check network
  await checkNetwork();

  // Try auto-connecting if permissions already granted
  try {
    const accounts = await provider.send("eth_accounts", []);
    if (accounts.length > 0) {
      await handleAccountsChanged(accounts);
    }
  } catch (err) {
    console.error("Auto-connect check failed:", err);
  }

  // Listen to MetaMask lifecycle events
  window.ethereum.on("accountsChanged", handleAccountsChanged);
  window.ethereum.on("chainChanged", handleChainChanged);
}

// Check and display network status
async function checkNetwork() {
  try {
    const network = await provider.getNetwork();
    const chainId = network.chainId;

    if (chainId === HARDHAT_CHAIN_ID) {
      isCorrectNetwork = true;
      networkBadge.className = "badge badge-network connected";
      networkName.textContent = "Hardhat Localhost (31337)";
      networkWarning.classList.add("hidden");
    } else {
      isCorrectNetwork = false;
      networkBadge.className = "badge badge-network error";
      networkName.textContent = `Wrong Network (${network.name || chainId})`;
      networkWarning.classList.remove("hidden");
    }
  } catch (error) {
    console.error("Failed to check network:", error);
  }
}

// Request switching to Hardhat Localhost
async function switchNetwork() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: HARDHAT_CHAIN_HEX }],
    });
  } catch (switchError) {
    // Error code 4902 indicates chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: HARDHAT_CHAIN_HEX,
              chainName: "Hardhat Localhost",
              rpcUrls: ["http://127.0.0.1:8545"],
              nativeCurrency: {
                name: "ETH",
                symbol: "ETH",
                decimals: 18,
              },
            },
          ],
        });
      } catch (addError) {
        console.error("Failed to add Hardhat network:", addError);
        alert("Failed to add Hardhat network to MetaMask. Please check console.");
      }
    } else {
      console.error("Failed to switch network:", switchError);
    }
  }
}

// Connect MetaMask wallet
async function connectWallet() {
  if (!hasMetaMask()) {
    window.open("https://metamask.io/download/", "_blank");
    return;
  }

  try {
    connectBtn.disabled = true;
    connectBtnText.textContent = "Connecting...";

    const accounts = await provider.send("eth_requestAccounts", []);
    await handleAccountsChanged(accounts);
  } catch (error) {
    console.error("Connection failed:", error);
    alert(`Could not connect to wallet: ${error.message}`);
  } finally {
    connectBtn.disabled = false;
  }
}

// Handle account change or initial connection
async function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    // Disconnected
    currentAccount = null;
    signer = null;
    contract = null;
    walletAddressDisplay.textContent = "Not Connected";
    walletBalanceDisplay.textContent = "-- ETH";
    connectBtnText.textContent = "Connect MetaMask";
    submitBtn.disabled = true;
    return;
  }

  currentAccount = accounts[0];
  signer = await provider.getSigner();

  walletAddressDisplay.textContent = formatAddress(currentAccount);
  walletAddressDisplay.title = currentAccount;
  connectBtnText.textContent = `Connected: ${formatAddress(currentAccount)}`;

  await updateBalance();
  await checkNetwork();

  // Instantiate contract with signer
  contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

  submitBtn.disabled = !isCorrectNetwork;

  // Read current value and subscribe to events
  await readStoredValue();
  setupEventListener();
}

// Handle chain switch
async function handleChainChanged() {
  // Recommended practice by MetaMask: reload or re-evaluate provider
  window.location.reload();
}

// Update ETH balance of connected wallet
async function updateBalance() {
  if (!currentAccount || !provider) return;
  try {
    const balance = await provider.getBalance(currentAccount);
    const ethBalance = parseFloat(ethers.formatEther(balance)).toFixed(4);
    walletBalanceDisplay.textContent = `${ethBalance} ETH`;
  } catch (err) {
    console.error("Failed to fetch balance:", err);
  }
}

// Read stored value from smart contract
async function readStoredValue() {
  if (!contract) {
    // If wallet not connected yet, we can still read using a read-only JsonRpcProvider
    try {
      valueLoading.classList.remove("hidden");
      storedValueDisplay.classList.add("hidden");

      const readProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readProvider);
      const val = await readContract.get();
      storedValueDisplay.textContent = `"${val}"`;
    } catch (err) {
      console.warn("Could not read via local JSON-RPC provider (node might not be started yet):", err.message);
      storedValueDisplay.textContent = "Node Offline / Not Deployed";
    } finally {
      valueLoading.classList.add("hidden");
      storedValueDisplay.classList.remove("hidden");
    }
    return;
  }

  try {
    valueLoading.classList.remove("hidden");
    storedValueDisplay.classList.add("hidden");

    const val = await contract.get();
    storedValueDisplay.textContent = `"${val}"`;
  } catch (error) {
    console.error("Error calling get():", error);
    storedValueDisplay.textContent = "Error reading value";
  } finally {
    valueLoading.classList.add("hidden");
    storedValueDisplay.classList.remove("hidden");
  }
}

// Update stored value on-chain (costs gas)
async function updateStoredValue(e) {
  e.preventDefault();

  const newValue = newValueInput.value.trim();
  if (!newValue) {
    alert("Please enter a value to store.");
    return;
  }

  if (!contract || !signer) {
    alert("Please connect your MetaMask wallet first.");
    return;
  }

  if (!isCorrectNetwork) {
    alert("Please switch MetaMask to Hardhat Localhost (Chain ID 31337).");
    return;
  }

  try {
    submitBtn.disabled = true;
    submitBtnText.textContent = "Sign in MetaMask...";

    // Show pending status
    txStatusBox.classList.remove("hidden");
    txStatusIcon.textContent = "📝";
    txStatusTitle.textContent = "Awaiting Signature";
    txStatusMessage.textContent = "Please confirm the transaction in your MetaMask popup...";

    // Send transaction
    const tx = await contract.set(newValue);

    txStatusIcon.textContent = "⏳";
    txStatusTitle.textContent = "Mining Transaction";
    txStatusMessage.textContent = `Tx Hash: ${tx.hash} (waiting for block confirmation...)`;
    submitBtnText.textContent = "Mining...";

    // Wait for 1 confirmation
    const receipt = await tx.wait(1);

    txStatusIcon.textContent = "✅";
    txStatusTitle.textContent = "Transaction Confirmed!";
    txStatusMessage.textContent = `Included in Block #${receipt.blockNumber} (Gas Used: ${receipt.gasUsed.toString()})`;

    // Reset input
    newValueInput.value = "";

    // Refresh value & balance
    await readStoredValue();
    await updateBalance();
  } catch (error) {
    console.error("Transaction error:", error);
    txStatusBox.classList.remove("hidden");
    txStatusIcon.textContent = "❌";
    txStatusTitle.textContent = "Transaction Failed";
    txStatusMessage.textContent = error.reason || error.message || "Unknown error";
  } finally {
    submitBtn.disabled = false;
    submitBtnText.textContent = "Submit to Blockchain (set)";
  }
}

// Setup real-time event listener for ValueUpdated
let isListening = false;
function setupEventListener() {
  if (!contract || isListening) return;

  try {
    contract.on("ValueUpdated", (updater, newValue, event) => {
      console.log("🔔 On-chain event detected: ValueUpdated", { updater, newValue });

      // Remove empty placeholder
      const emptyItem = eventsList.querySelector(".event-empty");
      if (emptyItem) emptyItem.remove();

      // Create new event item
      const item = document.createElement("li");
      item.className = "event-item";

      const timeStr = new Date().toLocaleTimeString();
      item.innerHTML = `
        <div class="event-meta">
          <span>By: <span class="mono">${formatAddress(updater)}</span></span>
          <span>${timeStr}</span>
        </div>
        <div class="event-value">"${newValue}"</div>
      `;

      eventsList.prepend(item);

      // Auto refresh stored value display
      storedValueDisplay.textContent = `"${newValue}"`;
    });

    isListening = true;
  } catch (err) {
    console.error("Could not attach event listener:", err);
  }
}

// Event Listeners
connectBtn.addEventListener("click", connectWallet);
switchNetworkBtn.addEventListener("click", switchNetwork);
refreshBtn.addEventListener("click", readStoredValue);
updateForm.addEventListener("submit", updateStoredValue);

// Preset Chips
document.querySelectorAll(".chip-btn").forEach((chip) => {
  chip.addEventListener("click", () => {
    newValueInput.value = chip.getAttribute("data-preset");
    newValueInput.focus();
  });
});

// Boot up
init();
