// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IChatRoom {
    enum RoomState {
        Created,
        Live,
        DebateEnded,
        Settled
    }

    struct RoomConfig {
        string topic;
        uint256 agentA;
        uint256 agentB;
        address masterAgent;
        address collateralToken;
        address predictionMarket;
        address masterAgentGuard;
        uint64 createdAt;
    }

    event RoomLive(uint256 indexed roomId, address indexed masterAgent);
    event MessageBatchCommitted(
        uint256 indexed roomId,
        uint256 indexed batchIndex,
        bytes32 messageRoot,
        address indexed masterAgent
    );
    event DebateEnded(uint256 indexed roomId, uint256 batchCount);
    event RoomSettled(uint256 indexed roomId, uint8 winningOutcome);
    event MasterRotated(
        uint256 indexed roomId,
        address indexed oldMaster,
        address indexed newMaster
    );

    function roomId() external view returns (uint256);

    function state() external view returns (RoomState);

    function config() external view returns (RoomConfig memory);

    function goLive() external;

    function commitMessageBatch(bytes32 messageRoot) external;

    function endDebate() external;

    function settle(uint8 winningOutcome) external;

    /// @notice Cancel market after debate (unclear/invalid). Traders claim refunds.
    function cancelSettlement() external;

    function rotateMaster(address newMaster) external;

    function getMessageRoot(uint256 batchIndex) external view returns (bytes32);

    function batchCount() external view returns (uint256);
}
