import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ethers } from "ethers";
import { formatCountdown, truncateAddress } from "@/lib/dexscreener";
import { BET_STATUS, DURATION_OPTIONS } from "@/lib/contract";
import { Timer, XCircle } from "lucide-react";

export interface BetData {
  id: number;
  bettor: string;
  tokenAddress: string;
  amount: bigint;
  duration: number;
  placedAt: number;
  expiresAt: number;
  status: number;
  survived: boolean;
  snapshotPrice: string;
  snapshotLiquidity: string;
}

interface BetCardProps {
  bet: BetData;
  isActive: boolean;
  onCancel?: (id: number) => void;
}

export function BetCard({ bet, isActive, onCancel }: BetCardProps) {
  const [remaining, setRemaining] = useState(
    bet.expiresAt - Math.floor(Date.now() / 1000)
  );

  useEffect(() => {
    if (!isActive) return;
    const iv = setInterval(() => {
      setRemaining(bet.expiresAt - Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [bet.expiresAt, isActive]);

  const statusColors: Record<number, string> = {
    0: "bg-primary/15 text-primary border-primary/30",
    1: "bg-green-500/15 text-green-400 border-green-500/30",
    2: "bg-destructive/15 text-destructive border-destructive/30",
    3: "bg-muted text-muted-foreground border-border",
  };

  const durationLabel =
    DURATION_OPTIONS.find((d) => d.value === bet.duration)?.label || `${bet.duration}s`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-5 space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-bold truncate mr-2">
              {truncateAddress(bet.tokenAddress)}
            </span>
            <Badge variant="outline" className={statusColors[bet.status]}>
              {BET_STATUS[bet.status]}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[0.65rem] text-muted-foreground uppercase">Amount</p>
              <p className="font-semibold text-sm">
                {parseFloat(ethers.formatEther(bet.amount)).toFixed(4)} ETH
              </p>
            </div>
            <div>
              <p className="text-[0.65rem] text-muted-foreground uppercase">Duration</p>
              <p className="font-semibold text-sm">{durationLabel}</p>
            </div>
            <div>
              <p className="text-[0.65rem] text-muted-foreground uppercase">Entry Price</p>
              <p className="font-semibold text-sm">${bet.snapshotPrice}</p>
            </div>
            <div>
              <p className="text-[0.65rem] text-muted-foreground uppercase">Entry Liq.</p>
              <p className="font-semibold text-sm">
                ${Number(bet.snapshotLiquidity).toLocaleString()}
              </p>
            </div>
          </div>

          {isActive && (
            <div className="text-center py-2.5 rounded-md bg-primary/5 border border-primary/10">
              <div className="flex items-center justify-center gap-1.5 text-primary font-bold text-sm">
                <Timer className="w-4 h-4" />
                {remaining > 0 ? formatCountdown(remaining) : "Ready for Resolution"}
              </div>
            </div>
          )}

          {isActive && onCancel && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => onCancel(bet.id)}
            >
              <XCircle className="w-4 h-4" /> Cancel Bet
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface BetsSectionProps {
  title: string;
  bets: BetData[];
  emptyIcon: string;
  emptyText: string;
  isActive: boolean;
  onCancel?: (id: number) => void;
}

export function BetsSection({ title, bets, emptyIcon, emptyText, isActive, onCancel }: BetsSectionProps) {
  return (
    <section id={isActive ? "active" : "history"} className="relative z-10 max-w-5xl mx-auto px-6 md:px-10 py-16">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-3xl md:text-4xl font-bold text-center mb-10"
      >
        {title.split(" ").map((w, i) =>
          i === title.split(" ").length - 1 ? (
            <span key={i} className="text-primary">{w}</span>
          ) : (
            <span key={i}>{w} </span>
          )
        )}
      </motion.h2>

      {bets.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl block mb-3">{emptyIcon}</span>
          <p className="text-muted-foreground">{emptyText}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bets.map((bet) => (
            <BetCard
              key={bet.id}
              bet={bet}
              isActive={isActive}
              onCancel={onCancel}
            />
          ))}
        </div>
      )}
    </section>
  );
}
