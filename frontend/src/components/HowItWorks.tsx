import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Coins, Brain, Trophy } from "lucide-react";

const steps = [
  { icon: Search, title: "Search Token", desc: "Enter any meme token address. We fetch live price and liquidity data from DexScreener.", num: "01" },
  { icon: Coins, title: "Place Your Bet", desc: "Choose a duration (1h–7d) and bet ETH on whether the token will survive.", num: "02" },
  { icon: Brain, title: "AI Resolves", desc: "GenLayer's Intelligent Contract fetches live data and uses AI consensus to determine the outcome.", num: "03" },
  { icon: Trophy, title: "Collect Payout", desc: "If your token survived, you get 2x your bet. If it got rugged, the house keeps the pot.", num: "04" },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative z-10 max-w-5xl mx-auto px-6 md:px-10 py-16">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-3xl md:text-4xl font-bold text-center mb-10"
      >
        How It <span className="text-primary">Works</span>
      </motion.h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {steps.map((s, i) => (
          <motion.div
            key={s.num}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="h-full relative overflow-hidden hover:-translate-y-1 transition-transform">
              <span className="absolute top-3 right-4 text-5xl font-black text-primary/5">
                {s.num}
              </span>
              <CardContent className="pt-8 pb-6 px-5 text-center space-y-3">
                <s.icon className="w-10 h-10 mx-auto text-primary" />
                <h3 className="font-bold text-sm">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
