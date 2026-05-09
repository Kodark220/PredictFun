# { "Depends": "py-genlayer:test" }

import json
from dataclasses import dataclass
from genlayer import *

# ─── Error Classification ──────────────────────────────────────────────────────

ERROR_EXPECTED  = "[EXPECTED]"
ERROR_EXTERNAL  = "[EXTERNAL]"
ERROR_TRANSIENT = "[TRANSIENT]"
ERROR_LLM       = "[LLM_ERROR]"

# ─── Data Structures ───────────────────────────────────────────────────────────

@allow_storage
@dataclass
class BetRecord:
    bet_id: str
    token_address: str
    snapshot_price: str
    snapshot_liquidity: str
    duration_seconds: str
    placed_at: str
    status: str              # "active", "survived", "rugged", "error"
    resolution_reasoning: str


# ─── Canonical Error Handler ────────────────────────────────────────────────────

def _handle_leader_error(leaders_res, leader_fn) -> bool:
    leader_msg = leaders_res.message if hasattr(leaders_res, "message") else ""
    try:
        leader_fn()
        return False  # Leader errored, validator succeeded — disagree
    except gl.vm.UserError as e:
        validator_msg = e.message if hasattr(e, "message") else str(e)
        if validator_msg.startswith(ERROR_EXPECTED) or validator_msg.startswith(ERROR_EXTERNAL):
            return validator_msg == leader_msg
        if validator_msg.startswith(ERROR_TRANSIENT) and leader_msg.startswith(ERROR_TRANSIENT):
            return True
        return False
    except Exception:
        return False


# ─── LLM Resilience ────────────────────────────────────────────────────────────

def _parse_json(text: str) -> dict:
    """Clean LLM JSON: strip wrapping text, fix trailing commas."""
    import re
    first = text.find("{")
    last = text.rfind("}")
    if first == -1 or last == -1:
        raise gl.vm.UserError(f"{ERROR_LLM} No JSON object found in response")
    text = text[first : last + 1]
    text = re.sub(r',(?!\s*?[\{\["\'\w])', "", text)
    return json.loads(text)


def _parse_survival_result(analysis) -> dict:
    """Extract survival verdict from LLM response, handling common variations."""
    if not isinstance(analysis, dict):
        if isinstance(analysis, str):
            analysis = _parse_json(analysis)
        else:
            raise gl.vm.UserError(f"{ERROR_LLM} Non-dict response: {type(analysis)}")

    # Extract survived boolean — LLMs use many alternate keys
    survived = analysis.get("survived")
    if survived is None:
        for alt in ("alive", "survival", "result", "outcome", "survived_flag", "is_alive"):
            if alt in analysis:
                survived = analysis[alt]
                break

    if survived is None:
        raise gl.vm.UserError(f"{ERROR_LLM} Missing 'survived'. Keys: {list(analysis.keys())}")

    # Coerce to boolean
    if isinstance(survived, str):
        survived = survived.strip().lower() in ("true", "yes", "1", "survived", "alive")
    elif isinstance(survived, (int, float)):
        survived = bool(survived)

    # Extract reasoning
    reasoning = analysis.get("reasoning", "")
    if not reasoning:
        for alt in ("reason", "analysis", "explanation", "rationale"):
            if alt in analysis:
                reasoning = str(analysis[alt])
                break

    # Extract price change percentage
    price_change = analysis.get("price_change_pct", 0)
    if price_change is None:
        for alt in ("price_change", "pct_change", "change_pct"):
            if alt in analysis:
                price_change = analysis[alt]
                break

    try:
        price_change = float(str(price_change).strip().replace("%", ""))
    except (ValueError, TypeError):
        price_change = 0.0

    # Extract current liquidity
    liquidity = analysis.get("current_liquidity", 0)
    if liquidity is None:
        for alt in ("liquidity", "liq", "total_liquidity"):
            if alt in analysis:
                liquidity = analysis[alt]
                break

    try:
        liquidity = float(str(liquidity).strip().replace("$", "").replace(",", ""))
    except (ValueError, TypeError):
        liquidity = 0.0

    return {
        "survived": bool(survived),
        "reasoning": str(reasoning)[:500],
        "price_change_pct": price_change,
        "current_liquidity": liquidity,
    }


# ─── Contract ──────────────────────────────────────────────────────────────────

class MemeSurvivorIC(gl.Contract):
    # Storage fields — typed, persisted on-chain
    owner: Address
    bets: TreeMap[str, str]       # bet_id -> JSON-serialized BetRecord
    bet_ids: DynArray[str]        # ordered list of bet IDs
    bet_count: u256
    evm_contract_address: str     # Base Sepolia contract address for bridge callbacks
    bridge_sender: Address        # GenLayer BridgeSender address
    target_chain_eid: u256        # LayerZero endpoint ID for target chain

    def __init__(self, evm_contract: str, bridge_sender_addr: str, target_eid: int):
        self.owner = gl.message.sender_account
        self.evm_contract_address = evm_contract
        self.bridge_sender = Address(bridge_sender_addr)
        self.target_chain_eid = u256(target_eid)
        self.bet_count = u256(0)

    # ─── Write Methods ──────────────────────────────────────────────────

    @gl.public.write
    def process_bridge_message(
        self, message_id: str, source_chain_id: int, source_sender: str, message: bytes
    ) -> None:
        """Register a new bet from the EVM contract via bridge."""
        # Decode the message from EVM
        # Expected abi: (uint256 bet_id, string token_address, string snapshot_price, string snapshot_liquidity, uint256 duration_seconds, uint256 placed_at)
        decoded = gl.evm.decode((u256, str, str, str, u256, u256), message)
        bet_id = str(decoded[0])
        token_address = decoded[1]
        snapshot_price = decoded[2]
        snapshot_liquidity = decoded[3]
        duration_seconds = str(decoded[4])
        placed_at = str(decoded[5])
        if bet_id in self.bets:
            raise gl.UserError(f"{ERROR_EXPECTED} Bet {bet_id} already registered")

        record = BetRecord(
            bet_id=bet_id,
            token_address=token_address,
            snapshot_price=snapshot_price,
            snapshot_liquidity=snapshot_liquidity,
            duration_seconds=duration_seconds,
            placed_at=placed_at,
            status="active",
            resolution_reasoning="",
        )
        self.bets[bet_id] = json.dumps({
            "bet_id": record.bet_id,
            "token_address": record.token_address,
            "snapshot_price": record.snapshot_price,
            "snapshot_liquidity": record.snapshot_liquidity,
            "duration_seconds": record.duration_seconds,
            "placed_at": record.placed_at,
            "status": record.status,
            "resolution_reasoning": record.resolution_reasoning,
        })
        self.bet_ids.append(bet_id)
        self.bet_count = u256(int(self.bet_count) + 1)

    @gl.public.write
    def resolve_bet(self, bet_id: str) -> dict:
        """
        Resolve a bet using live DexScreener data + AI consensus.
        Uses run_nondet_unsafe with a custom validator for robust consensus.
        """
        if bet_id not in self.bets:
            raise gl.UserError(f"{ERROR_EXPECTED} Bet {bet_id} not found")

        bet_data = json.loads(self.bets[bet_id])
        if bet_data["status"] != "active":
            raise gl.UserError(f"{ERROR_EXPECTED} Bet {bet_id} already resolved: {bet_data['status']}")

        token_address = bet_data["token_address"]
        snapshot_price = bet_data["snapshot_price"]
        snapshot_liquidity = bet_data["snapshot_liquidity"]

        # ─── Leader + Validator Functions ────────────────────────────

        def leader_fn():
            # Step 1: Fetch live market data from DexScreener
            dexscreener_url = f"https://api.dexscreener.com/latest/dex/tokens/{token_address}"
            res = gl.nondet.web.get(dexscreener_url)

            if res.status >= 500:
                raise gl.vm.UserError(f"{ERROR_TRANSIENT} DexScreener API temporarily unavailable: {res.status}")
            if res.status >= 400:
                raise gl.vm.UserError(f"{ERROR_EXTERNAL} DexScreener API error: {res.status}")

            data = json.loads(res.body.decode("utf-8"))
            pairs = data.get("pairs", [])

            if not pairs:
                raise gl.vm.UserError(f"{ERROR_EXTERNAL} No trading pairs found for token {token_address}")

            # Use the highest liquidity pair
            main_pair = max(pairs, key=lambda p: float(p.get("liquidity", {}).get("usd", 0) or 0))

            current_price = str(main_pair.get("priceUsd", "0"))
            current_liquidity = str(main_pair.get("liquidity", {}).get("usd", 0))
            price_change_24h = str(main_pair.get("priceChange", {}).get("h24", "0"))
            volume_24h = str(main_pair.get("volume", {}).get("h24", 0))
            pair_name = main_pair.get("baseToken", {}).get("symbol", "UNKNOWN")

            # Step 2: AI analysis for survival determination
            prompt = f"""You are a meme token survival analyst. Analyze the following market data and determine if this token has "survived" or been "rugged/dumped".

TOKEN: {pair_name} ({token_address})

SNAPSHOT AT BET PLACEMENT:
- Price: ${snapshot_price}
- Liquidity: ${snapshot_liquidity}

CURRENT MARKET DATA:
- Current Price: ${current_price}
- Current Liquidity: ${current_liquidity}
- 24h Price Change: {price_change_24h}%
- 24h Volume: ${volume_24h}

SURVIVAL CRITERIA:
A token is considered "SURVIVED" if ALL of the following are true:
1. Price has NOT dropped more than 80% from snapshot price
2. Liquidity has NOT dropped below $5,000
3. The token does NOT show signs of a rug-pull (e.g., 95%+ price crash, zero liquidity, removed liquidity)

A token is "RUGGED" if ANY of those conditions are violated.

Respond with a JSON object:
{{
    "survived": true/false,
    "reasoning": "Brief explanation of your analysis",
    "price_change_pct": <number, percentage change from snapshot>,
    "current_liquidity": <number, current liquidity in USD>
}}"""

            analysis = gl.nondet.exec_prompt(prompt, response_format="json")
            result = _parse_survival_result(analysis)

            return result

        def validator_fn(leaders_res) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return _handle_leader_error(leaders_res, leader_fn)

            # Run our own analysis
            validator_result = leader_fn()
            leader_result = leaders_res.calldata

            # Critical: survived boolean MUST match exactly
            if leader_result["survived"] != validator_result["survived"]:
                return False

            # Price change tolerance: within ±10 percentage points
            leader_pct = leader_result.get("price_change_pct", 0)
            validator_pct = validator_result.get("price_change_pct", 0)

            if abs(leader_pct - validator_pct) > 10:
                return False

            # Liquidity must agree on category (above or below threshold)
            leader_liq = leader_result.get("current_liquidity", 0)
            validator_liq = validator_result.get("current_liquidity", 0)

            LIQUIDITY_THRESHOLD = 5000
            leader_above = leader_liq >= LIQUIDITY_THRESHOLD
            validator_above = validator_liq >= LIQUIDITY_THRESHOLD
            if leader_above != validator_above:
                return False

            return True

        # ─── Execute with consensus ─────────────────────────────────

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        # ─── Update bet state ───────────────────────────────────────

        bet_data["status"] = "survived" if result["survived"] else "rugged"
        bet_data["resolution_reasoning"] = result.get("reasoning", "")
        self.bets[bet_id] = json.dumps(bet_data)

        # ─── Send result back to EVM via Bridge ─────────────────────
        # Encode (uint256 betId, bool survived)
        abi = [u256, bool]
        encoder = gl.evm.MethodEncoder("", abi, bool)
        message_bytes = encoder.encode_call([u256(int(bet_id)), result["survived"]])[4:]

        bridge_contract = gl.get_contract_at(self.bridge_sender)
        bridge_contract.emit().send_message(self.target_chain_eid, self.evm_contract_address, message_bytes)

        return result

    # ─── View Methods ───────────────────────────────────────────────────

    @gl.public.view
    def get_bet(self, bet_id: str) -> dict:
        """Get a single bet's data."""
        if bet_id not in self.bets:
            raise gl.UserError(f"{ERROR_EXPECTED} Bet {bet_id} not found")
        return json.loads(self.bets[bet_id])

    @gl.public.view
    def get_all_bets(self) -> list:
        """Get all registered bets."""
        results = []
        for i in range(len(self.bet_ids)):
            bid = self.bet_ids[i]
            results.append(json.loads(self.bets[bid]))
        return results

    @gl.public.view
    def get_active_bets(self) -> list:
        """Get all active (unresolved) bets."""
        results = []
        for i in range(len(self.bet_ids)):
            bid = self.bet_ids[i]
            data = json.loads(self.bets[bid])
            if data["status"] == "active":
                results.append(data)
        return results

    @gl.public.view
    def get_bet_count(self) -> int:
        return int(self.bet_count)
