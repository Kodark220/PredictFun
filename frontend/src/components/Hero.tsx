import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crosshair, ArrowRight, Rocket, Skull, Brain } from "lucide-react";

const floatAnim = (delay: number) => ({
  y: [0, -14, 0],
  transition: { duration: 6, repeat: Infinity, ease: "easeInOut", delay },
});

interface HeroProps {
  totalBets: number;
  activeBets: number;
  volume: string;
}

export function Hero({ totalBets, activeBets, volume }: HeroProps) {
  return (
    <section
      id="home"
      className="relative z-10 min-h-screen flex flex-col lg:flex-row items-center justify-center gap-16 px-6 md:px-10 pt-28 pb-20"
    >
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
        className="max-w-xl"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 text-green-400 text-xs font-bold tracking-wider mb-6">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          LIVE ON BASE SEPOLIA
        </div>

        <h1 className="font-bold text-5xl md:text-6xl leading-[1.1] mb-5">
          Will Your Meme
          <span className="block bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 bg-clip-text text-transparent animate-gradient-x">
            Survive?
          </span>
        </h1>

        <p className="text-muted-foreground text-lg leading-relaxed mb-8">
          Place bets on meme token survival. AI-powered resolution via{" "}
          <strong className="text-primary">GenLayer</strong> consensus reads
          live market data to determine if your token survives — or gets rugged.
        </p>

        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { value: totalBets, label: "Total Bets" },
            { value: activeBets, label: "Active" },
            { value: volume, label: "Volume" },
            { value: "2x", label: "Payout" },
          ].map((stat) => (
            <Card key={stat.label} className="text-center py-3">
              <CardContent className="p-0">
                <span className="block text-xl font-bold text-primary">
                  {stat.value}
                </span>
                <span className="text-[0.65rem] text-muted-foreground uppercase tracking-wider">
                  {stat.label}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-3">
          <Button size="lg" asChild>
            <a href="#place-bet">
              <Crosshair className="w-4 h-4" /> Place a Bet
            </a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="#how-it-works">
              How It Works <ArrowRight className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="relative w-72 h-80 shrink-0 hidden lg:block"
      >
        <motion.div animate={floatAnim(0)} className="absolute top-0 left-0">
          <Card className="px-5 py-4 flex flex-col items-center gap-1 bg-card/80 backdrop-blur-xl">
            <Rocket className="w-8 h-8 text-green-400" />
            <span className="text-[0.65rem] font-bold tracking-wider text-muted-foreground">
              SURVIVED
            </span>
            <span className="font-bold text-green-400">+2x</span>
          </Card>
        </motion.div>
        <motion.div animate={floatAnim(2)} className="absolute top-16 right-0">
          <Card className="px-5 py-4 flex flex-col items-center gap-1 bg-card/80 backdrop-blur-xl">
            <Skull className="w-8 h-8 text-destructive" />
            <span className="text-[0.65rem] font-bold tracking-wider text-muted-foreground">
              RUGGED
            </span>
            <span className="font-bold text-destructive">-100%</span>
          </Card>
        </motion.div>
        <motion.div
          animate={floatAnim(4)}
          className="absolute bottom-0 left-10"
        >
          <Card className="px-5 py-4 flex flex-col items-center gap-1 bg-card/80 backdrop-blur-xl">
            <Brain className="w-8 h-8 text-primary" />
            <span className="text-[0.65rem] font-bold tracking-wider text-muted-foreground">
              AI CONSENSUS
            </span>
            <span className="font-bold text-primary">GenLayer</span>
          </Card>
        </motion.div>
      </motion.div>
    </section>
  );
}
