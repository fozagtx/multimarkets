// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {ICoinbaseOracleAdapter} from "./interfaces/ICoinbaseOracleAdapter.sol";
import {IAggregatorV3} from "./interfaces/IAggregatorV3.sol";

/// @title CoinbaseOracleAdapter
/// @notice Verifies Coinbase-style EIP-191 signed price messages and reads APRO AggregatorV3 feeds.
/// @dev Coinbase oracle format used here:
///      messageHash = keccak256(abi.encodePacked(base, "/", quote, price, decimals, timestamp))
///      signed with personal_sign (EIP-191 version 0x45) by the authorized Coinbase oracle signer.
///      An off-chain relayer submits the signed payload on-chain.
contract CoinbaseOracleAdapter is ICoinbaseOracleAdapter, Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    address public coinbaseOracleSigner;

    /// @notice Maximum age for a Coinbase price submission to be accepted / considered fresh.
    uint256 public maxPriceAge = 15 minutes;

    /// @notice Latest submitted Coinbase prices keyed by pairId = keccak256(base, quote).
    mapping(bytes32 => CoinbasePriceData) private _coinbasePrices;

    error ZeroAddress();
    error InvalidPrice();
    error StalePrice(uint64 timestamp);
    error FutureTimestamp(uint64 timestamp);
    error InvalidSignature();
    error PriceNotFound(bytes32 pairId);
    error InvalidFeedAnswer();
    error StaleFeed(uint256 updatedAt);

    constructor(address initialOwner, address initialCoinbaseSigner) Ownable(initialOwner) {
        if (initialCoinbaseSigner == address(0)) revert ZeroAddress();
        coinbaseOracleSigner = initialCoinbaseSigner;
    }

    /// @notice Update the authorized Coinbase oracle public key / EOA signer.
    function setCoinbaseOracleSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert ZeroAddress();
        address old = coinbaseOracleSigner;
        coinbaseOracleSigner = newSigner;
        emit CoinbaseOracleSignerUpdated(old, newSigner);
    }

    /// @notice Update maximum acceptable price age (seconds).
    function setMaxPriceAge(uint256 newAge) external onlyOwner {
        require(newAge >= 30 seconds, "age too short");
        uint256 old = maxPriceAge;
        maxPriceAge = newAge;
        emit MaxPriceAgeUpdated(old, newAge);
    }

    /// @inheritdoc ICoinbaseOracleAdapter
    function submitCoinbasePrice(
        string calldata base,
        string calldata quote,
        int256 price,
        uint8 decimals,
        uint64 timestamp,
        bytes calldata signature
    ) external {
        if (price <= 0) revert InvalidPrice();
        if (timestamp > block.timestamp) revert FutureTimestamp(timestamp);
        if (block.timestamp - uint256(timestamp) > maxPriceAge) revert StalePrice(timestamp);

        bytes32 messageHash = _coinbaseMessageHash(base, quote, price, decimals, timestamp);
        bytes32 ethSigned = messageHash.toEthSignedMessageHash();
        address recovered = ethSigned.recover(signature);
        if (recovered != coinbaseOracleSigner) revert InvalidSignature();

        bytes32 pairId = pairKey(base, quote);

        // Only accept newer or equal timestamps (allow equal for re-submit of same tick).
        CoinbasePriceData storage existing = _coinbasePrices[pairId];
        if (existing.timestamp != 0 && timestamp < existing.timestamp) {
            revert StalePrice(timestamp);
        }

        _coinbasePrices[pairId] = CoinbasePriceData({
            base: base,
            quote: quote,
            price: price,
            decimals: decimals,
            timestamp: timestamp,
            submitter: msg.sender
        });

        emit CoinbasePriceSubmitted(pairId, base, quote, price, timestamp, msg.sender);
    }

    /// @inheritdoc ICoinbaseOracleAdapter
    function getCoinbasePrice(string calldata base, string calldata quote)
        external
        view
        returns (int256 price, uint8 decimals, uint64 timestamp)
    {
        bytes32 pairId = pairKey(base, quote);
        CoinbasePriceData storage data = _coinbasePrices[pairId];
        if (data.timestamp == 0) revert PriceNotFound(pairId);
        if (block.timestamp - uint256(data.timestamp) > maxPriceAge) {
            revert StalePrice(data.timestamp);
        }
        return (data.price, data.decimals, data.timestamp);
    }

    /// @inheritdoc ICoinbaseOracleAdapter
    function getAPROPrice(address feed)
        external
        view
        returns (int256 price, uint8 decimals, uint64 updatedAt)
    {
        if (feed == address(0)) revert ZeroAddress();
        IAggregatorV3 aggregator = IAggregatorV3(feed);

        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAtRaw,
            uint80 answeredInRound
        ) = aggregator.latestRoundData();

        if (answer <= 0) revert InvalidFeedAnswer();
        if (answeredInRound < roundId) revert InvalidFeedAnswer();
        if (updatedAtRaw == 0 || block.timestamp - updatedAtRaw > maxPriceAge) {
            revert StaleFeed(updatedAtRaw);
        }

        return (answer, aggregator.decimals(), uint64(updatedAtRaw));
    }

    /// @notice Raw storage read without freshness check (for indexers).
    function getCoinbasePriceRaw(string calldata base, string calldata quote)
        external
        view
        returns (CoinbasePriceData memory)
    {
        return _coinbasePrices[pairKey(base, quote)];
    }

    /// @notice Deterministic pair id for base/quote symbols.
    function pairKey(string calldata base, string calldata quote) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(base, "/", quote));
    }

    /// @notice Message hash that the Coinbase oracle signer is expected to personal_sign.
    function coinbaseMessageHash(
        string calldata base,
        string calldata quote,
        int256 price,
        uint8 decimals,
        uint64 timestamp
    ) external pure returns (bytes32) {
        return _coinbaseMessageHash(base, quote, price, decimals, timestamp);
    }

    function _coinbaseMessageHash(
        string calldata base,
        string calldata quote,
        int256 price,
        uint8 decimals,
        uint64 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(base, "/", quote, price, decimals, timestamp));
    }
}
