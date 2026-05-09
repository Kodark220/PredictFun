export interface TokenData {
  name: string;
  symbol: string;
  chain: string;
  price: string;
  liquidity: number;
  change24h: number;
  volume24h: number;
}

export async function lookupToken(address: string): Promise<TokenData> {
  const res = await fetch(
    `https://api.dexscreener.com/latest/dex/tokens/${address}`
  );
  const data = await res.json();

  if (!data.pairs || data.pairs.length === 0) {
    throw new Error("No trading pairs found for this token");
  }

  const pair = data.pairs.reduce(
    (a: Record<string, unknown>, b: Record<string, unknown>) => {
      const aLiq = parseFloat(
        (a.liquidity as Record<string, string>)?.usd || "0"
      );
      const bLiq = parseFloat(
        (b.liquidity as Record<string, string>)?.usd || "0"
      );
      return bLiq > aLiq ? b : a;
    }
  );

  return {
    name: (pair.baseToken as Record<string, string>)?.name || "Unknown",
    symbol: (pair.baseToken as Record<string, string>)?.symbol || "???",
    chain: (pair.chainId as string) || "unknown",
    price: (pair.priceUsd as string) || "0",
    liquidity: (pair.liquidity as Record<string, number>)?.usd || 0,
    change24h: (pair.priceChange as Record<string, number>)?.h24 || 0,
    volume24h: (pair.volume as Record<string, number>)?.h24 || 0,
  };
}

export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "Expired";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export function truncateAddress(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}
