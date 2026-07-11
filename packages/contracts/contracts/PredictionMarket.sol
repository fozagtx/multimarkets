// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IPredictionMarket} from "./interfaces/IPredictionMarket.sol";
import {IChatRoom} from "./interfaces/IChatRoom.sol";

/// @title PredictionMarket
/// @notice Parimutuel binary / multi-outcome market settled from a linked ChatRoom debate.
/// @dev Users buy outcome shares 1:1 with collateral (minus fee). On resolve, winners split
///      the entire collateral pool pro-rata by winning shares. Optional LP liquidity
///      dilutes payouts proportionally via `seedLiquidity`.
contract PredictionMarket is IPredictionMarket, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_FEE_BPS = 1_000; // 10%
    uint256 public constant BPS_DENOMINATOR = 10_000;

    address public immutable chatRoom;
    address public immutable collateralToken;
    address public settlementAuthority;

    MarketType public marketType;
    MarketState public marketState;
    uint8 public outcomeCount;
    uint8 public winningOutcome;
    uint256 public feeBps;
    uint256 public minStake;
    uint64 public openAt;
    uint64 public closeAt;

    uint256 public totalPool;
    uint256 public seedLiquidity;
    uint256 public protocolFees;

    mapping(uint8 => uint256) private _outcomePools;
    mapping(address => mapping(uint8 => uint256)) private _userShares;
    mapping(address => bool) private _claimed;

    bool private _resolved;
    bool private _cancelled;

    error ZeroAddress();
    error InvalidOutcomeCount();
    error InvalidFee();
    error InvalidTiming();
    error MarketNotOpen();
    error MarketNotClosed();
    error MarketAlreadyResolved();
    error MarketNotResolved();
    error MarketIsCancelled();
    error InvalidOutcome(uint8 outcome);
    error AmountBelowMinStake(uint256 amount, uint256 minStake);
    error TransferFailed();
    error NothingToClaim();
    error AlreadyClaimed();
    error NotSettlementAuthority(address caller);
    error NotChatRoom(address caller);
    error DebateNotEnded();
    error CloseTimeNotReached();

    modifier onlySettlementAuthority() {
        if (msg.sender != settlementAuthority && msg.sender != owner() && msg.sender != chatRoom) {
            revert NotSettlementAuthority(msg.sender);
        }
        _;
    }

    constructor(
        address initialOwner,
        address chatRoom_,
        address collateralToken_,
        address settlementAuthority_,
        MarketParams memory params
    ) Ownable(initialOwner) {
        if (chatRoom_ == address(0) || collateralToken_ == address(0) || settlementAuthority_ == address(0)) {
            revert ZeroAddress();
        }
        if (params.outcomeCount < 2 || params.outcomeCount > 32) revert InvalidOutcomeCount();
        if (params.marketType == MarketType.Binary && params.outcomeCount != 2) {
            revert InvalidOutcomeCount();
        }
        if (params.feeBps > MAX_FEE_BPS) revert InvalidFee();
        if (params.closeAt != 0 && params.openAt != 0 && params.closeAt <= params.openAt) {
            revert InvalidTiming();
        }

        chatRoom = chatRoom_;
        collateralToken = collateralToken_;
        settlementAuthority = settlementAuthority_;
        marketType = params.marketType;
        outcomeCount = params.outcomeCount;
        feeBps = params.feeBps;
        minStake = params.minStake;
        openAt = params.openAt == 0 ? uint64(block.timestamp) : params.openAt;
        closeAt = params.closeAt;
        marketState = MarketState.Open;
    }

    /// @inheritdoc IPredictionMarket
    function buyShares(uint8 outcome, uint256 amount) external nonReentrant {
        _requireOpen();
        if (outcome >= outcomeCount) revert InvalidOutcome(outcome);
        if (amount < minStake) revert AmountBelowMinStake(amount, minStake);

        IERC20(collateralToken).safeTransferFrom(msg.sender, address(this), amount);

        uint256 fee = (amount * feeBps) / BPS_DENOMINATOR;
        uint256 net = amount - fee;
        protocolFees += fee;

        _outcomePools[outcome] += net;
        _userShares[msg.sender][outcome] += net;
        totalPool += net;

        emit SharesPurchased(msg.sender, outcome, amount, net);
    }

    /// @inheritdoc IPredictionMarket
    /// @dev LP seed is held in the pool and dilutes winning payouts; redeemable only if cancelled.
    function addLiquidity(uint256 amount) external nonReentrant {
        _requireOpen();
        if (amount == 0) revert AmountBelowMinStake(amount, 1);

        IERC20(collateralToken).safeTransferFrom(msg.sender, address(this), amount);
        seedLiquidity += amount;
        totalPool += amount;

        emit LiquidityAdded(msg.sender, amount);
    }

    /// @inheritdoc IPredictionMarket
    function closeMarket() external {
        if (marketState != MarketState.Open) revert MarketNotOpen();
        if (msg.sender != settlementAuthority && msg.sender != owner() && msg.sender != chatRoom) {
            if (closeAt == 0 || block.timestamp < closeAt) revert CloseTimeNotReached();
        }
        marketState = MarketState.Closed;
        emit MarketClosed(block.timestamp);
    }

    /// @inheritdoc IPredictionMarket
    /// @dev ONLY the linked ChatRoom may resolve. Prevents market Resolved while room stays DebateEnded.
    ///      Call path: ChatRoom.endDebate() → closeMarket → ChatRoom.settle(outcome) → resolve.
    function resolve(uint8 winningOutcome_) external nonReentrant {
        if (msg.sender != chatRoom) revert NotChatRoom(msg.sender);
        if (_resolved || marketState == MarketState.Resolved) revert MarketAlreadyResolved();
        if (_cancelled || marketState == MarketState.Cancelled) revert MarketIsCancelled();
        if (winningOutcome_ >= outcomeCount) revert InvalidOutcome(winningOutcome_);

        // Settlement requires the linked debate to have ended (or already Settled mid-call).
        IChatRoom.RoomState roomState = IChatRoom(chatRoom).state();
        if (
            roomState != IChatRoom.RoomState.DebateEnded
                && roomState != IChatRoom.RoomState.Settled
        ) {
            revert DebateNotEnded();
        }

        if (marketState == MarketState.Open) {
            marketState = MarketState.Closed;
            emit MarketClosed(block.timestamp);
        }

        winningOutcome = winningOutcome_;
        _resolved = true;
        marketState = MarketState.Resolved;

        emit MarketResolved(winningOutcome_, totalPool);
    }

    /// @inheritdoc IPredictionMarket
    function cancel() external onlySettlementAuthority nonReentrant {
        if (_resolved) revert MarketAlreadyResolved();
        if (_cancelled) revert MarketIsCancelled();
        _cancelled = true;
        marketState = MarketState.Cancelled;
        emit MarketCancelled(block.timestamp);
    }

    /// @inheritdoc IPredictionMarket
    function claim() external nonReentrant returns (uint256 payout) {
        if (_claimed[msg.sender]) revert AlreadyClaimed();

        if (_cancelled) {
            // Refund all shares + proportional claim on seed is not tracked per-user for seed;
            // users get full share balances back across all outcomes.
            uint256 refund;
            for (uint8 i = 0; i < outcomeCount; ) {
                refund += _userShares[msg.sender][i];
                unchecked {
                    ++i;
                }
            }
            if (refund == 0) revert NothingToClaim();
            _claimed[msg.sender] = true;
            IERC20(collateralToken).safeTransfer(msg.sender, refund);
            emit PayoutClaimed(msg.sender, refund);
            return refund;
        }

        if (!_resolved) revert MarketNotResolved();

        uint256 userWinningShares = _userShares[msg.sender][winningOutcome];
        if (userWinningShares == 0) revert NothingToClaim();

        uint256 winningPool = _outcomePools[winningOutcome];
        if (winningPool == 0) revert NothingToClaim();

        // Pro-rata of full collateral pool (including seed liquidity).
        payout = (totalPool * userWinningShares) / winningPool;
        _claimed[msg.sender] = true;

        IERC20(collateralToken).safeTransfer(msg.sender, payout);
        emit PayoutClaimed(msg.sender, payout);
    }

    /// @notice Withdraw accumulated protocol fees (owner).
    function withdrawFees(address to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 amount = protocolFees;
        protocolFees = 0;
        if (amount == 0) revert NothingToClaim();
        IERC20(collateralToken).safeTransfer(to, amount);
    }

    /// @notice Update settlement authority (owner).
    function setSettlementAuthority(address newAuthority) external onlyOwner {
        if (newAuthority == address(0)) revert ZeroAddress();
        settlementAuthority = newAuthority;
    }

    /// @inheritdoc IPredictionMarket
    function getUserShares(address user, uint8 outcome) external view returns (uint256) {
        return _userShares[user][outcome];
    }

    /// @inheritdoc IPredictionMarket
    function getOutcomePool(uint8 outcome) external view returns (uint256) {
        return _outcomePools[outcome];
    }

    function hasClaimed(address user) external view returns (bool) {
        return _claimed[user];
    }

    function previewPayout(address user) external view returns (uint256) {
        if (_cancelled) {
            uint256 refund;
            for (uint8 i = 0; i < outcomeCount; ) {
                refund += _userShares[user][i];
                unchecked {
                    ++i;
                }
            }
            return refund;
        }
        if (!_resolved) return 0;
        uint256 userWinningShares = _userShares[user][winningOutcome];
        uint256 winningPool = _outcomePools[winningOutcome];
        if (userWinningShares == 0 || winningPool == 0) return 0;
        return (totalPool * userWinningShares) / winningPool;
    }

    function _requireOpen() internal view {
        if (marketState != MarketState.Open) revert MarketNotOpen();
        if (block.timestamp < openAt) revert MarketNotOpen();
        if (closeAt != 0 && block.timestamp >= closeAt) revert MarketNotOpen();
        if (_cancelled || _resolved) revert MarketNotOpen();
    }
}
