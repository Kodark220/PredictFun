export const CONTRACT_ADDRESS = "0x78453898e11153bdb7290F4B434D519c8b938304";

export const BASE_SEPOLIA_CHAIN_ID = "0x14a34"; // 84532
export const BASE_SEPOLIA_RPC = "https://sepolia.base.org";

export const CONTRACT_ABI = [
  "function placeBet(string tokenAddress, uint256 duration, string snapshotPrice, string snapshotLiquidity) payable",
  "function resolveBet(uint256 betId, bool survived)",
  "function cancelBet(uint256 betId)",
  "function getBet(uint256 betId) view returns (tuple(address bettor, string tokenAddress, uint256 amount, uint256 duration, uint256 placedAt, uint256 expiresAt, uint8 status, bool survived, string snapshotPrice, string snapshotLiquidity))",
  "function getUserBets(address user) view returns (uint256[])",
  "function getAllBetIds() view returns (uint256[])",
  "function getTotalBets() view returns (uint256)",
  "function getContractBalance() view returns (uint256)",
  "function MIN_BET() view returns (uint256)",
  "event BetPlaced(uint256 indexed betId, address indexed bettor, string tokenAddress, uint256 amount, uint256 duration, uint256 expiresAt, string snapshotPrice, string snapshotLiquidity)",
  "event BetResolved(uint256 indexed betId, address indexed bettor, bool survived, uint256 payout)",
  "event BetCancelled(uint256 indexed betId, address indexed bettor)"
];

export const BET_STATUS: Record<number, string> = {
  0: "Active", 1: "Won", 2: "Lost", 3: "Cancelled"
};

export const DURATION_OPTIONS = [
  { value: 3600, label: "1 Hour" },
  { value: 21600, label: "6 Hours" },
  { value: 86400, label: "24 Hours" },
  { value: 604800, label: "7 Days" },
];

export const PRESET_AMOUNTS = ["0.005", "0.01", "0.05", "0.1"];
