import { useState, useCallback } from "react";
import { ethers } from "ethers";
import {
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_RPC,
} from "@/lib/contract";

declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider & {
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export interface WalletState {
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  contract: ethers.Contract | null;
  address: string;
  connected: boolean;
}

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    provider: null,
    signer: null,
    contract: null,
    address: "",
    connected: false,
  });
  const [loading, setLoading] = useState(false);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error("Please install MetaMask");
    }
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }],
        });
      } catch (switchErr: unknown) {
        const err = switchErr as { code?: number };
        if (err.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: BASE_SEPOLIA_CHAIN_ID,
              chainName: "Base Sepolia",
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: [BASE_SEPOLIA_RPC],
              blockExplorerUrls: ["https://sepolia.basescan.org"],
            }],
          });
        }
      }

      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const contract = CONTRACT_ADDRESS
        ? new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
        : null;

      setWallet({ provider, signer, contract, address, connected: true });
    } finally {
      setLoading(false);
    }
  }, []);

  return { wallet, connect, loading };
}
