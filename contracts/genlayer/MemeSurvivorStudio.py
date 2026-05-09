# { "Depends": "py-genlayer:test" }

import json
from dataclasses import dataclass
from genlayer import *


@allow_storage
@dataclass
class BetRecord:
    bet_id: str
    token_address: str
    snapshot_price: str
    snapshot_liquidity: str
    status: str          # "active", "survived", "rugged"
    reasoning: str


class MemeSurvivorStudio(gl.Contract):
    bets: TreeMap[str, BetRecord]
    bet_count: u256

    def __init__(self):
        self.bet_count = u256(0)

    def _check_token_survival(
        self, token_address: str, snapshot_price: str, snapshot_liquidity: str
    ) -> dict:
        """
        Fetch live DexScreener data + AI analysis.
        Uses the same pattern as the official football_bets boilerplate.
        """
        def get_survival_result() -> str:
            dex_url = f"https://api.dexscreener.com/latest/dex/tokens/{token_address}"
            web_data = gl.nondet.web.get(dex_url, mode="text")

            task = f"""
Analyze if this meme token survived or got rugged.

Token: {token_address}
Snapshot Price: ${snapshot_price}
Snapshot Liquidity: ${snapshot_liquidity}

Live DexScreener data:
{web_data}

SURVIVAL CRITERIA:
- SURVIVED if price did NOT drop > 80% from snapshot AND liquidity > $5,000
- RUGGED if price crashed > 80% OR liquidity < $5,000

Respond in JSON:
{{
    "survived": true or false,
    "reason": "brief explanation",
    "current_price": "current price as string",
    "current_liquidity": "current liquidity as string"
}}
It is mandatory that you respond only using the JSON format above,
nothing else. Don't include any other words or characters,
your output must be only JSON without any formatting prefix or suffix.
This result should be perfectly parsable by a JSON parser without errors.
            """
            result = gl.nondet.exec_prompt(task, response_format="json")
            return json.dumps(result, sort_keys=True)

        result_json = json.loads(gl.eq_principle.strict_eq(get_survival_result))
        return result_json

    @gl.public.write
    def place_bet(
        self, token_address: str, snapshot_price: str, snapshot_liquidity: str
    ) -> None:
        """Register a new bet for a meme token."""
        bet_id = str(int(self.bet_count))

        bet = BetRecord(
            bet_id=bet_id,
            token_address=token_address,
            snapshot_price=snapshot_price,
            snapshot_liquidity=snapshot_liquidity,
            status="active",
            reasoning="",
        )
        self.bets[bet_id] = bet
        self.bet_count += 1

    @gl.public.write
    def resolve_bet(self, bet_id: str) -> None:
        """Resolve a bet using AI consensus."""
        if bet_id not in self.bets:
            raise Exception("Bet not found")

        bet = self.bets[bet_id]
        if bet.status != "active":
            raise Exception("Bet already resolved")

        result = self._check_token_survival(
            bet.token_address, bet.snapshot_price, bet.snapshot_liquidity
        )

        survived = result.get("survived", False)
        if isinstance(survived, str):
            survived = survived.lower() in ("true", "yes", "1")

        bet.status = "survived" if survived else "rugged"
        bet.reasoning = str(result.get("reason", ""))[:500]

    @gl.public.view
    def get_bet(self, bet_id: str) -> dict:
        if bet_id not in self.bets:
            raise Exception("Bet not found")
        b = self.bets[bet_id]
        return {
            "bet_id": b.bet_id,
            "token_address": b.token_address,
            "snapshot_price": b.snapshot_price,
            "snapshot_liquidity": b.snapshot_liquidity,
            "status": b.status,
            "reasoning": b.reasoning,
        }

    @gl.public.view
    def get_bet_count(self) -> int:
        return int(self.bet_count)
