// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPredictionMarket {
    enum MarketType {
        Binary,
        MultiOutcome
    }

    enum MarketState {
        Open,
        Closed,
        Resolved,
        Cancelled
    }

    struct MarketParams {
        MarketType marketType;
        uint8 outcomeCount;
        uint256 feeBps;
        uint256 minStake;
        uint64 openAt;
        uint64 closeAt;
    }

    event SharesPurchased(
        address indexed buyer,
        uint8 indexed outcome,
        uint256 amountIn,
        uint256 sharesOut
    );
    event LiquidityAdded(address indexed provider, uint256 amount);
    event MarketClosed(uint256 timestamp);
    event MarketResolved(uint8 indexed winningOutcome, uint256 totalPool);
    event MarketCancelled(uint256 timestamp);
    event PayoutClaimed(address indexed claimant, uint256 amount);

    function buyShares(uint8 outcome, uint256 amount) external;

    function addLiquidity(uint256 amount) external;

    function closeMarket() external;

    function resolve(uint8 winningOutcome) external;

    function cancel() external;

    function claim() external returns (uint256 payout);

    function getUserShares(address user, uint8 outcome) external view returns (uint256);

    function getOutcomePool(uint8 outcome) external view returns (uint256);

    function totalPool() external view returns (uint256);

    function marketState() external view returns (MarketState);

    function winningOutcome() external view returns (uint8);

    function outcomeCount() external view returns (uint8);

    function collateralToken() external view returns (address);

    function chatRoom() external view returns (address);

    function settlementAuthority() external view returns (address);
}
