import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

interface NavbarProps {
  address: string;
  connected: boolean;
  onConnect: () => void;
  loading: boolean;
}

export function Navbar({ address, connected, onConnect, loading }: NavbarProps) {
  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 bg-background/80 backdrop-blur-xl border-b border-border"
    >
      <div className="flex items-center gap-2.5 font-bold text-xl">
        <span className="text-2xl">💀</span>
        <span>
          Meme<span className="text-primary">Survivor</span>
        </span>
      </div>

      <div className="hidden md:flex items-center gap-1">
        {["Home", "Place Bet", "Active", "History"].map((item) => (
          <a
            key={item}
            href={`#${item.toLowerCase().replace(" ", "-")}`}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary transition-colors"
          >
            {item}
          </a>
        ))}
      </div>

      <Button
        variant={connected ? "outline" : "secondary"}
        onClick={onConnect}
        disabled={loading}
        className={connected ? "border-green-500/50 text-green-400" : ""}
      >
        <Wallet className="w-4 h-4" />
        {connected
          ? `${address.slice(0, 6)}...${address.slice(-4)}`
          : loading
          ? "Connecting..."
          : "Connect Wallet"}
      </Button>
    </motion.nav>
  );
}
