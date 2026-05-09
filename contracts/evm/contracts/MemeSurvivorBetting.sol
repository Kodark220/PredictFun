// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IGenLayerBridgeReceiver.sol";
import "./interfaces/IBridgeSender.sol";

/**
 * @title MemeSurvivorBetting
 * @notice Decentralized prediction market for meme token survival.
 *         Users place ETH bets on whether a meme token will "survive" a given
 *         duration. Resolution is performed by an authorized GenLayer resolver
 *         that reads live market data via AI consensus.
 */
contract MemeSurvivorBetting is ReentrancyGuard, Ownable, IGenLayerBridgeReceiver {
    // ─── Types ───────────────────────────────────────────────────────────

    enum BetStatus {
        Active,
        Won,
        Lost,
        Cancelled
    }

    struct Bet {
        address bettor;
        string tokenAddress;      // The meme token contract address being bet on
        uint256 amount;           // ETH wagered (in wei)
        uint256 duration;         // Duration in seconds
        uint256 placedAt;         // Block timestamp of bet placement
        uint256 expiresAt;        // Timestamp when bet can be resolved
        BetStatus status;
        bool survived;            // Resolution outcome
        string snapshotPrice;     // Price at bet placement (stored as string for precision)
        string snapshotLiquidity; // Liquidity at bet placement
    }

    // ─── Constants ───────────────────────────────────────────────────────

    uint256 public constant MIN_BET = 0.001 ether;
    uint256 public constant PAYOUT_MULTIPLIER = 2;

    uint256 public constant DURATION_1H  = 1 hours;
    uint256 public constant DURATION_6H  = 6 hours;
    uint256 public constant DURATION_24H = 24 hours;
    uint256 public constant DURATION_7D  = 7 days;

    // ─── State ───────────────────────────────────────────────────────────

    uint256 public nextBetId;
    address public resolver;     // Authorized GenLayer bridge/relayer address
    IBridgeSender public bridgeSender;
    address public genLayerTargetContract;

    mapping(uint256 => Bet) public bets;
    mapping(address => uint256[]) public userBets;

    uint256[] public allBetIds;

    // ─── Events ──────────────────────────────────────────────────────────

    event BetPlaced(
        uint256 indexed betId,
        address indexed bettor,
        string tokenAddress,
        uint256 amount,
        uint256 duration,
        uint256 expiresAt,
        string snapshotPrice,
        string snapshotLiquidity
    );

    event BetResolved(
        uint256 indexed betId,
        address indexed bettor,
        bool survived,
        uint256 payout
    );

    event BetCancelled(uint256 indexed betId, address indexed bettor);
    event ResolverUpdated(address indexed oldResolver, address indexed newResolver);

    // ─── Errors ──────────────────────────────────────────────────────────

    error BetTooSmall();
    error InvalidDuration();
    error BetNotActive();
    error BetNotExpired();
    error NotResolver();
    error NotBettor();
    error PayoutFailed();
    error InsufficientContractBalance();

    // ─── Modifiers ───────────────────────────────────────────────────────

    modifier onlyResolver() {
        if (msg.sender != resolver) revert NotResolver();
        _;
    }

    modifier validDuration(uint256 _duration) {
        if (
            _duration != DURATION_1H &&
            _duration != DURATION_6H &&
            _duration != DURATION_24H &&
            _duration != DURATION_7D
        ) revert InvalidDuration();
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────

    constructor(address _resolver) Ownable(msg.sender) {
        resolver = _resolver;
        emit ResolverUpdated(address(0), _resolver);
    }

    // ─── External Functions ──────────────────────────────────────────────

    /**
     * @notice Quote the total cost (Bet + LayerZero Fee)
     */
    function quoteBet(
        string calldata _tokenAddress,
        uint256 _duration,
        string calldata _snapshotPrice,
        string calldata _snapshotLiquidity
    ) external view returns (uint256) {
        bytes memory data = abi.encode(
            nextBetId,
            _tokenAddress,
            _snapshotPrice,
            _snapshotLiquidity,
            _duration,
            block.timestamp
        );
        (uint256 nativeFee, ) = bridgeSender.quoteSendToGenLayer(genLayerTargetContract, data, "");
        return MIN_BET + nativeFee;
    }

    /**
     * @notice Place a bet on a meme token's survival.
     * @param _tokenAddress The token contract address (e.g., on Solana, Base, etc.)
     * @param _duration Duration in seconds (must be a valid preset)
     * @param _snapshotPrice Current price at time of bet (from frontend DexScreener call)
     * @param _snapshotLiquidity Current liquidity at time of bet
     */
    function placeBet(
        string calldata _tokenAddress,
        uint256 _duration,
        string calldata _snapshotPrice,
        string calldata _snapshotLiquidity
    ) external payable nonReentrant validDuration(_duration) {
        
        uint256 betId = nextBetId++;
        uint256 expiresAt = block.timestamp + _duration;

        bytes memory data = abi.encode(
            betId,
            _tokenAddress,
            _snapshotPrice,
            _snapshotLiquidity,
            _duration,
            block.timestamp
        );

        (uint256 nativeFee, ) = bridgeSender.quoteSendToGenLayer(genLayerTargetContract, data, "");
        if (msg.value < MIN_BET + nativeFee) revert BetTooSmall();

        uint256 betAmount = msg.value - nativeFee;

        bets[betId] = Bet({
            bettor: msg.sender,
            tokenAddress: _tokenAddress,
            amount: betAmount,
            duration: _duration,
            placedAt: block.timestamp,
            expiresAt: expiresAt,
            status: BetStatus.Active,
            survived: false,
            snapshotPrice: _snapshotPrice,
            snapshotLiquidity: _snapshotLiquidity
        });

        userBets[msg.sender].push(betId);
        allBetIds.push(betId);

        emit BetPlaced(
            betId,
            msg.sender,
            _tokenAddress,
            betAmount,
            _duration,
            expiresAt,
            _snapshotPrice,
            _snapshotLiquidity
        );

        // Forward to GenLayer
        bridgeSender.sendToGenLayer{value: nativeFee}(genLayerTargetContract, data, "");
    }

    /**
     * @notice Resolve a bet. Called by the LayerZero Bridge Receiver.
     */
    function processBridgeMessage(
        uint32 /*_sourceChainId*/,
        address /*_sourceContract*/,
        bytes calldata _message
    ) external nonReentrant onlyResolver {
        (uint256 _betId, bool _survived) = abi.decode(_message, (uint256, bool));

        Bet storage bet = bets[_betId];
        if (bet.status != BetStatus.Active) revert BetNotActive();
        if (block.timestamp < bet.expiresAt) revert BetNotExpired();

        bet.survived = _survived;
        uint256 payout = 0;

        if (_survived) {
            bet.status = BetStatus.Won;
            payout = bet.amount * PAYOUT_MULTIPLIER;

            if (address(this).balance < payout) revert InsufficientContractBalance();

            (bool success, ) = payable(bet.bettor).call{value: payout}("");
            if (!success) revert PayoutFailed();
        } else {
            bet.status = BetStatus.Lost;
        }

        emit BetResolved(_betId, bet.bettor, _survived, payout);
    }

    /**
     * @notice Cancel an active bet before expiry. Only the bettor can cancel.
     *         Refunds 90% of the bet amount (10% fee for cancellation).
     * @param _betId The bet to cancel
     */
    function cancelBet(uint256 _betId) external nonReentrant {
        Bet storage bet = bets[_betId];
        if (bet.status != BetStatus.Active) revert BetNotActive();
        if (msg.sender != bet.bettor) revert NotBettor();

        bet.status = BetStatus.Cancelled;
        uint256 refund = (bet.amount * 90) / 100; // 90% refund

        (bool success, ) = payable(bet.bettor).call{value: refund}("");
        if (!success) revert PayoutFailed();

        emit BetCancelled(_betId, bet.bettor);
    }

    // ─── Admin ───────────────────────────────────────────────────────────

    /**
     * @notice Update the authorized resolver address.
     * @param _newResolver New resolver address
     */
    function setResolver(address _newResolver) external onlyOwner {
        address old = resolver;
        resolver = _newResolver;
        emit ResolverUpdated(old, _newResolver);
    }

    /**
     * @notice Set bridge configuration
     */
    function setBridgeConfig(address _bridgeSender, address _genLayerTargetContract) external onlyOwner {
        bridgeSender = IBridgeSender(_bridgeSender);
        genLayerTargetContract = _genLayerTargetContract;
    }

    /**
     * @notice Fund the contract for payouts.
     */
    function fundContract() external payable onlyOwner {}

    /**
     * @notice Withdraw excess funds (only funds not backing active bets).
     */
    function withdrawExcess(uint256 _amount) external onlyOwner {
        uint256 totalLiability = _calculateActiveLiability();
        uint256 excess = address(this).balance > totalLiability
            ? address(this).balance - totalLiability
            : 0;

        require(_amount <= excess, "Amount exceeds excess balance");

        (bool success, ) = payable(owner()).call{value: _amount}("");
        if (!success) revert PayoutFailed();
    }

    // ─── View Functions ──────────────────────────────────────────────────

    function getBet(uint256 _betId) external view returns (Bet memory) {
        return bets[_betId];
    }

    function getUserBets(address _user) external view returns (uint256[] memory) {
        return userBets[_user];
    }

    function getAllBetIds() external view returns (uint256[] memory) {
        return allBetIds;
    }

    function getTotalBets() external view returns (uint256) {
        return nextBetId;
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // ─── Internal ────────────────────────────────────────────────────────

    function _calculateActiveLiability() internal view returns (uint256) {
        uint256 liability = 0;
        for (uint256 i = 0; i < nextBetId; i++) {
            if (bets[i].status == BetStatus.Active) {
                liability += bets[i].amount * PAYOUT_MULTIPLIER;
            }
        }
        return liability;
    }

    receive() external payable {}
}
