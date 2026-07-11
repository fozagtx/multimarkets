// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {OracleThresholdMarket} from "./OracleThresholdMarket.sol";

/// @notice Deploys independent, oracle-settled binary threshold markets.
contract OracleThresholdMarketFactory is Ownable {
    address public immutable collateralToken;
    address public oracleSigner;
    address public settlementAuthority;
    uint64 public maxPriceAge;
    uint256 public feeBps;
    uint256 public minStake;

    address[] private markets;

    error ZeroAddress();
    error InvalidConfiguration();

    event MarketCreated(
        address indexed market,
        address indexed creator,
        string baseAsset,
        string quoteAsset,
        int256 threshold,
        uint64 deadline
    );
    event OracleSignerUpdated(address indexed signer);
    event SettlementAuthorityUpdated(address indexed authority);

    constructor(
        address initialOwner,
        address collateralToken_,
        address oracleSigner_,
        address settlementAuthority_,
        uint64 maxPriceAge_,
        uint256 feeBps_,
        uint256 minStake_
    ) Ownable(initialOwner) {
        if (
            collateralToken_ == address(0) ||
            oracleSigner_ == address(0) ||
            settlementAuthority_ == address(0)
        ) revert ZeroAddress();
        if (maxPriceAge_ == 0 || feeBps_ > 1_000) revert InvalidConfiguration();
        collateralToken = collateralToken_;
        oracleSigner = oracleSigner_;
        settlementAuthority = settlementAuthority_;
        maxPriceAge = maxPriceAge_;
        feeBps = feeBps_;
        minStake = minStake_;
    }

    function createMarket(
        string calldata baseAsset,
        string calldata quoteAsset,
        int256 threshold,
        uint64 deadline
    ) external returns (address marketAddress) {
        OracleThresholdMarket market = new OracleThresholdMarket(
            settlementAuthority,
            collateralToken,
            oracleSigner,
            settlementAuthority,
            baseAsset,
            quoteAsset,
            threshold,
            deadline,
            maxPriceAge,
            feeBps,
            minStake
        );
        marketAddress = address(market);
        markets.push(marketAddress);
        emit MarketCreated(marketAddress, msg.sender, baseAsset, quoteAsset, threshold, deadline);
    }

    function setOracleSigner(address signer) external onlyOwner {
        if (signer == address(0)) revert ZeroAddress();
        oracleSigner = signer;
        emit OracleSignerUpdated(signer);
    }

    function setSettlementAuthority(address authority) external onlyOwner {
        if (authority == address(0)) revert ZeroAddress();
        settlementAuthority = authority;
        emit SettlementAuthorityUpdated(authority);
    }

    function marketCount() external view returns (uint256) {
        return markets.length;
    }

    function marketAt(uint256 index) external view returns (address) {
        return markets[index];
    }
}
