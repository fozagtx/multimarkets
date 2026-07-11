// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @notice Binary parimutuel market resolved by a signed price observation at its deadline.
/// @dev YES is outcome 0: price >= threshold. NO is outcome 1: price < threshold.
contract OracleThresholdMarket is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum MarketState {
        Open,
        Closed,
        Resolved,
        Cancelled
    }

    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant MAX_FEE_BPS = 1_000;

    IERC20 public immutable collateralToken;
    address public immutable oracleSigner;
    address public immutable settlementAuthority;
    string public baseAsset;
    string public quoteAsset;
    int256 public immutable threshold;
    uint64 public immutable deadline;
    uint64 public immutable maxPriceAge;
    uint256 public immutable feeBps;
    uint256 public immutable minStake;

    MarketState public marketState;
    uint8 public winningOutcome;
    int256 public resolvedPrice;
    uint64 public resolvedAt;
    uint256 public totalPool;
    uint256 public protocolFees;

    mapping(uint8 => uint256) private outcomePools;
    mapping(address => mapping(uint8 => uint256)) private userShares;
    mapping(address => bool) private claimed;

    error ZeroAddress();
    error InvalidTiming();
    error InvalidThreshold();
    error InvalidFee();
    error MarketNotOpen();
    error MarketNotResolvable();
    error MarketAlreadyFinalized();
    error AmountBelowMinStake(uint256 amount, uint256 minimum);
    error InvalidOutcome(uint8 outcome);
    error InvalidSignature();
    error PriceBeforeDeadline(uint64 timestamp, uint64 deadline);
    error StalePrice(uint64 timestamp, uint64 maxAge);
    error NotSettlementAuthority(address caller);
    error NothingToClaim();
    error AlreadyClaimed();

    event SharesPurchased(address indexed buyer, uint8 indexed outcome, uint256 grossAmount, uint256 netAmount);
    event MarketClosed(uint64 timestamp);
    event PriceResolved(
        int256 indexed price,
        uint64 indexed priceTimestamp,
        uint8 indexed winningOutcome,
        uint256 totalPool
    );
    event MarketCancelled(uint64 timestamp);
    event PayoutClaimed(address indexed claimant, uint256 payout);

    constructor(
        address initialOwner,
        address collateralToken_,
        address oracleSigner_,
        address settlementAuthority_,
        string memory baseAsset_,
        string memory quoteAsset_,
        int256 threshold_,
        uint64 deadline_,
        uint64 maxPriceAge_,
        uint256 feeBps_,
        uint256 minStake_
    ) Ownable(initialOwner) {
        if (
            collateralToken_ == address(0) ||
            oracleSigner_ == address(0) ||
            settlementAuthority_ == address(0)
        ) revert ZeroAddress();
        if (deadline_ <= block.timestamp || maxPriceAge_ == 0) revert InvalidTiming();
        if (threshold_ <= 0) revert InvalidThreshold();
        if (feeBps_ > MAX_FEE_BPS) revert InvalidFee();

        collateralToken = IERC20(collateralToken_);
        oracleSigner = oracleSigner_;
        settlementAuthority = settlementAuthority_;
        baseAsset = baseAsset_;
        quoteAsset = quoteAsset_;
        threshold = threshold_;
        deadline = deadline_;
        maxPriceAge = maxPriceAge_;
        feeBps = feeBps_;
        minStake = minStake_;
        marketState = MarketState.Open;
    }

    function buyShares(uint8 outcome, uint256 amount) external nonReentrant {
        if (marketState != MarketState.Open || block.timestamp >= deadline) revert MarketNotOpen();
        if (outcome > 1) revert InvalidOutcome(outcome);
        if (amount < minStake) revert AmountBelowMinStake(amount, minStake);

        collateralToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 fee = (amount * feeBps) / BPS_DENOMINATOR;
        uint256 netAmount = amount - fee;
        protocolFees += fee;
        outcomePools[outcome] += netAmount;
        userShares[msg.sender][outcome] += netAmount;
        totalPool += netAmount;

        emit SharesPurchased(msg.sender, outcome, amount, netAmount);
    }

    function closeMarket() external {
        if (marketState != MarketState.Open) revert MarketNotOpen();
        if (msg.sender != settlementAuthority && msg.sender != owner() && block.timestamp < deadline) {
            revert MarketNotResolvable();
        }
        marketState = MarketState.Closed;
        emit MarketClosed(uint64(block.timestamp));
    }

    /// @notice Resolve using an EIP-191 signature by the configured oracle signer.
    function resolve(
        int256 price,
        uint64 priceTimestamp,
        bytes calldata signature
    ) external nonReentrant {
        if (marketState == MarketState.Resolved || marketState == MarketState.Cancelled) {
            revert MarketAlreadyFinalized();
        }
        if (block.timestamp < deadline) revert MarketNotResolvable();
        if (priceTimestamp < deadline) revert PriceBeforeDeadline(priceTimestamp, deadline);
        if (priceTimestamp > block.timestamp || block.timestamp - priceTimestamp > maxPriceAge) {
            revert StalePrice(priceTimestamp, maxPriceAge);
        }

        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(
            keccak256(
                abi.encodePacked(
                    address(this),
                    baseAsset,
                    "/",
                    quoteAsset,
                    price,
                    priceTimestamp
                )
            )
        );
        if (ECDSA.recover(digest, signature) != oracleSigner) revert InvalidSignature();

        if (marketState == MarketState.Open) {
            marketState = MarketState.Closed;
            emit MarketClosed(uint64(block.timestamp));
        }
        winningOutcome = price >= threshold ? 0 : 1;
        resolvedPrice = price;
        resolvedAt = priceTimestamp;
        marketState = MarketState.Resolved;
        emit PriceResolved(price, priceTimestamp, winningOutcome, totalPool);
    }

    function cancel() external {
        if (msg.sender != settlementAuthority && msg.sender != owner()) {
            revert NotSettlementAuthority(msg.sender);
        }
        if (marketState == MarketState.Resolved || marketState == MarketState.Cancelled) {
            revert MarketAlreadyFinalized();
        }
        marketState = MarketState.Cancelled;
        emit MarketCancelled(uint64(block.timestamp));
    }

    function claim() external nonReentrant returns (uint256 payout) {
        if (claimed[msg.sender]) revert AlreadyClaimed();

        if (marketState == MarketState.Cancelled) {
            payout = userShares[msg.sender][0] + userShares[msg.sender][1];
        } else {
            if (marketState != MarketState.Resolved) revert NothingToClaim();
            uint256 winningShares = userShares[msg.sender][winningOutcome];
            uint256 winningPool = outcomePools[winningOutcome];
            if (winningShares == 0 || winningPool == 0) revert NothingToClaim();
            payout = (totalPool * winningShares) / winningPool;
        }

        if (payout == 0) revert NothingToClaim();
        claimed[msg.sender] = true;
        collateralToken.safeTransfer(msg.sender, payout);
        emit PayoutClaimed(msg.sender, payout);
    }

    function getOutcomePool(uint8 outcome) external view returns (uint256) {
        if (outcome > 1) revert InvalidOutcome(outcome);
        return outcomePools[outcome];
    }

    function getUserShares(address user, uint8 outcome) external view returns (uint256) {
        if (outcome > 1) revert InvalidOutcome(outcome);
        return userShares[user][outcome];
    }

    function previewPayout(address user) external view returns (uint256) {
        if (marketState == MarketState.Cancelled) {
            return userShares[user][0] + userShares[user][1];
        }
        if (marketState != MarketState.Resolved) return 0;
        uint256 winningShares = userShares[user][winningOutcome];
        uint256 winningPool = outcomePools[winningOutcome];
        if (winningShares == 0 || winningPool == 0) return 0;
        return (totalPool * winningShares) / winningPool;
    }
}
