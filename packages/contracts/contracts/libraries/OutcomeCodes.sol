// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title OutcomeCodes
/// @notice Canonical binary market encoding for MultiMarkets / MultiMarkets.
/// @dev Off-chain agents must map YES→0, NO→1. UNCLEAR/INVALID → ChatRoom.cancelSettlement().
library OutcomeCodes {
    uint8 internal constant YES = 0;
    uint8 internal constant NO = 1;

    /// @dev Sentinel used in RoomSettled event when cancelSettlement is used (not a winning outcome).
    uint8 internal constant CANCELLED = type(uint8).max;
}
