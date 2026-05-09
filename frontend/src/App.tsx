import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ParticleCanvas } from "@/components/ParticleCanvas";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { BetForm } from "@/components/BetForm";
import { BetsSection, type BetData } from "@/components/BetCard";
import { useWallet } from "@/hooks/useWallet";
import type { TokenData } from "@/lib/dexscreener";

function App() {
  const { wallet, connect, loading } = useWallet();
  const [activeBets, setActiveBets] = useState<BetData[]>([]);
  const [resolvedBets, setResolvedBets] = useState<BetData[]>([]);
  const [totalBets, setTotalBets] = useState(0);
  const [volume, setVolume] = useState("0");

  const loadBets = useCallback(async () => {
    if (!wallet.contract || !wallet.address) return;
    try {
      const betIds: bigint[] = await wallet.contract.getUserBets(wallet.address);
      const active: BetData[] = [];
      const resolved: BetData[] = [];
      let vol = 0n;

      for (const id of betIds) {
        const b = await wallet.contract.getBet(id);
        const bet: BetData = {
          id: Number(id),
          bettor: b.bettor,
          tokenAddress: b.tokenAddress,
          amount: b.amount,
          duration: Number(b.duration),
          placedAt: Number(b.placedAt),
          expiresAt: Number(b.expiresAt),
          status: Number(b.status),
          survived: b.survived,
          snapshotPrice: b.snapshotPrice,
          snapshotLiquidity: b.snapshotLiquidity,
        };
        vol += b.amount;
        if (bet.status === 0) active.push(bet);
        else resolved.push(bet);
      }

      setActiveBets(active);
      setResolvedBets(resolved);
      setVolume(parseFloat(ethers.formatEther(vol)).toFixed(3));

      const total = await wallet.contract.getTotalBets();
      setTotalBets(Number(total));
    } catch (err) {
      console.error("Failed to load bets:", err);
    }
  }, [wallet.contract, wallet.address]);

  useEffect(() => {
    loadBets();
  }, [loadBets]);

  const handlePlaceBet = async (
    tokenAddr: string,
    duration: number,
    amount: string,
    token: TokenData
  ) => {
    if (!wallet.contract) {
      alert("Contract not deployed yet. Set CONTRACT_ADDRESS in lib/contract.ts");
      return;
    }
    const tx = await wallet.contract.placeBet(
      tokenAddr,
      duration,
      token.price.toString(),
      token.liquidity.toString(),
      { value: ethers.parseEther(amount) }
    );
    await tx.wait();
    loadBets();
  };

  const handleCancelBet = async (betId: number) => {
    if (!wallet.contract) return;
    const tx = await wallet.contract.cancelBet(betId);
    await tx.wait();
    loadBets();
  };

  return (
    <TooltipProvider>
      <div className="dark min-h-screen bg-background text-foreground">
        <ParticleCanvas />
        <Navbar
          address={wallet.address}
          connected={wallet.connected}
          onConnect={connect}
          loading={loading}
        />
        <Hero totalBets={totalBets} activeBets={activeBets.length} volume={`${volume} ETH`} />
        <HowItWorks />
        <BetForm onPlaceBet={handlePlaceBet} connected={wallet.connected} />
        <BetsSection
          title="Active Bets"
          bets={activeBets}
          emptyIcon="🎲"
          emptyText="No active bets yet. Place your first bet above!"
          isActive={true}
          onCancel={handleCancelBet}
        />
        <BetsSection
          title="Bet History"
          bets={resolvedBets}
          emptyIcon="📜"
          emptyText="No resolved bets yet."
          isActive={false}
        />
        <footer className="relative z-10 py-10 text-center border-t border-border">
          <div className="flex items-center justify-center gap-2 font-bold text-lg mb-2">
            <span>💀</span> Meme<strong>Survivor</strong>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Powered by <strong className="text-foreground/70">GenLayer</strong> AI Consensus · Built on{" "}
            <strong className="text-foreground/70">Base Sepolia</strong>
          </p>
          <div className="flex justify-center gap-5 text-xs text-muted-foreground">
            {[
              ["GenLayer", "https://www.genlayer.com/"],
              ["Basescan", "https://sepolia.basescan.org"],
              ["DexScreener", "https://dexscreener.com"],
            ].map(([name, url]) => (
              <a key={name} href={url} target="_blank" rel="noopener" className="hover:text-primary transition-colors">
                {name}
              </a>
            ))}
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}

export default App;
