// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICoinbaseOracleAdapter {
    struct CoinbasePriceData {
        string base;
        string quote;
        int256 price;
        uint8 decimals;
        uint64 timestamp;
        address submitter;
    }

    event CoinbasePriceSubmitted(
        bytes32 indexed pairId,
        string base,
        string quote,
        int256 price,
        uint64 timestamp,
        address indexed submitter
    );
    event CoinbaseOracleSignerUpdated(address indexed oldSigner, address indexed newSigner);
    event MaxPriceAgeUpdated(uint256 oldAge, uint256 newAge);

    function submitCoinbasePrice(
        string calldata base,
        string calldata quote,
        int256 price,
        uint8 decimals,
        uint64 timestamp,
        bytes calldata signature
    ) external;

    function getCoinbasePrice(string calldata base, string calldata quote)
        external
        view
        returns (
            int256 price,
            uint8 decimals,
            uint64 timestamp
        );

    function getAPROPrice(address feed)
        external
        view
        returns (
            int256 price,
            uint8 decimals,
            uint64 updatedAt
        );

    function coinbaseOracleSigner() external view returns (address);
}
