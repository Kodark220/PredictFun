import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, Settings, Crosshair } from "lucide-react";
import { lookupToken, type TokenData } from "@/lib/dexscreener";
import { DURATION_OPTIONS, PRESET_AMOUNTS } from "@/lib/contract";
import { ethers } from "ethers";

interface BetFormProps {
  onPlaceBet: (tokenAddr: string, duration: number, amount: string, token: TokenData) => Promise<void>;
  connected: boolean;
}

export function BetForm({ onPlaceBet, connected }: BetFormProps) {
  const [tokenAddr, setTokenAddr] = useState("");
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [duration, setDuration] = useState(21600);
  const [amount, setAmount] = useState("0.01");
  const [placing, setPlacing] = useState(false);

  const handleLookup = async () => {
    if (!tokenAddr.trim()) return;
    setLookingUp(true);
    try {
      const data = await lookupToken(tokenAddr.trim());
      setTokenData(data);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLookingUp(false);
    }
  };

  const handlePlace = async () => {
    if (!tokenData || !amount) return;
    setPlacing(true);
    try {
      await onPlaceBet(tokenAddr.trim(), duration, amount, tokenData);
    } finally {
      setPlacing(false);
    }
  };

  const payout = (parseFloat(amount || "0") * 2).toFixed(4);
  const durationLabel = DURATION_OPTIONS.find((d) => d.value === duration)?.label || "";

  return (
    <section id="place-bet" className="relative z-10 max-w-5xl mx-auto px-6 md:px-10 py-16">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-3xl md:text-4xl font-bold text-center mb-10"
      >
        Place a <span className="text-primary">Bet</span>
      </motion.h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Token Lookup */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Search className="w-5 h-5 text-primary" /> Token Lookup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Token Contract Address
                </label>
                <div className="flex gap-2">
                  <Input
                    value={tokenAddr}
                    onChange={(e) => setTokenAddr(e.target.value)}
                    placeholder="0x... or paste token address"
                    onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                  />
                  <Button
                    variant="secondary"
                    onClick={handleLookup}
                    disabled={lookingUp}
                    className="shrink-0"
                  >
                    {lookingUp ? "..." : "Lookup"}
                  </Button>
                </div>
              </div>

              {tokenData && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg bg-secondary/50 border border-border space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold">{tokenData.name}</span>
                      <span className="text-muted-foreground ml-2 text-sm">
                        ${tokenData.symbol}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-primary border-primary/30">
                      {tokenData.chain.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[0.65rem] text-muted-foreground uppercase">Price</p>
                      <p className="font-semibold">${parseFloat(tokenData.price).toFixed(8)}</p>
                    </div>
                    <div>
                      <p className="text-[0.65rem] text-muted-foreground uppercase">Liquidity</p>
                      <p className="font-semibold">${tokenData.liquidity.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[0.65rem] text-muted-foreground uppercase">24h Change</p>
                      <p className={`font-semibold ${tokenData.change24h >= 0 ? "text-green-400" : "text-destructive"}`}>
                        {tokenData.change24h >= 0 ? "+" : ""}{tokenData.change24h.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.65rem] text-muted-foreground uppercase">24h Volume</p>
                      <p className="font-semibold">${tokenData.volume24h.toLocaleString()}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Bet Config */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="w-5 h-5 text-primary" /> Bet Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Duration
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {DURATION_OPTIONS.map((d) => (
                    <Button
                      key={d.value}
                      variant={duration === d.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDuration(d.value)}
                      className="text-xs"
                    >
                      {d.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Bet Amount (ETH)
                </label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.01"
                  step="0.001"
                  min="0.001"
                />
                <div className="flex gap-2 mt-2">
                  {PRESET_AMOUNTS.map((a) => (
                    <Button
                      key={a}
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(a)}
                      className="text-xs flex-1"
                    >
                      {a}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-2">
                {[
                  ["Your Bet", `${amount || "0"} ETH`],
                  ["Potential Payout", payout + " ETH", true],
                  ["Duration", durationLabel],
                  ["Multiplier", "2x", true],
                ].map(([label, val, green], i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{label as string}</span>
                      <span className={green ? "text-green-400 font-semibold" : "font-semibold"}>
                        {val as string}
                      </span>
                    </div>
                    {i < 3 && <Separator className="my-2" />}
                  </div>
                ))}
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={!connected || !tokenData || placing || !amount || parseFloat(amount) < 0.001}
                onClick={handlePlace}
              >
                <Crosshair className="w-4 h-4" />
                {placing ? "Placing Bet..." : "Place Bet"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Min bet: {ethers.formatEther(ethers.parseEther("0.001"))} ETH · Resolved by GenLayer AI consensus
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
