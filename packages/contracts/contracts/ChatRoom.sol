// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IChatRoom} from "./interfaces/IChatRoom.sol";
import {IPredictionMarket} from "./interfaces/IPredictionMarket.sol";
import {IMasterAgentGuard} from "./interfaces/IMasterAgentGuard.sol";
import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";

/// @title ChatRoom
/// @notice Debate room state machine: Created → Live → DebateEnded → Settled.
/// @dev Master agent posts batch message roots (Merkle/commitment). Heartbeats go through MasterAgentGuard.
contract ChatRoom is IChatRoom, Ownable {
    uint256 public immutable roomId;
    address public immutable agentRegistry;
    address public immutable factory;

    RoomState public state;
    address public masterAgent;
    address public predictionMarket;
    address public masterAgentGuard;
    address public collateralToken;

    string public topic;
    uint256 public agentA;
    uint256 public agentB;
    uint64 public createdAt;
    uint64 public liveAt;
    uint64 public debateEndedAt;

    bytes32[] private _messageRoots;

    error ZeroAddress();
    error InvalidState(RoomState current, RoomState required);
    error NotMaster(address caller);
    error NotGuard(address caller);
    error NotFactoryOrOwner(address caller);
    error AgentsInactive();
    error SameAgents();
    error EmptyTopic();
    error BatchRootEmpty();
    error MarketNotSet();
    error OnlyOnce();
    error InvalidWinningOutcome(uint8 outcome);
    error NotSettlementCaller(address caller);

    modifier onlyMaster() {
        if (msg.sender != masterAgent) revert NotMaster(msg.sender);
        _;
    }

    modifier inState(RoomState required) {
        if (state != required) revert InvalidState(state, required);
        _;
    }

    constructor(
        address initialOwner,
        uint256 roomId_,
        string memory topic_,
        uint256 agentA_,
        uint256 agentB_,
        address masterAgent_,
        address collateralToken_,
        address agentRegistry_,
        address masterAgentGuard_,
        address factory_
    ) Ownable(initialOwner) {
        if (
            masterAgent_ == address(0) || collateralToken_ == address(0) || agentRegistry_ == address(0)
                || masterAgentGuard_ == address(0) || factory_ == address(0)
        ) {
            revert ZeroAddress();
        }
        if (bytes(topic_).length == 0) revert EmptyTopic();
        if (agentA_ == agentB_) revert SameAgents();

        IAgentRegistry registry = IAgentRegistry(agentRegistry_);
        if (!registry.isActiveAgent(agentA_) || !registry.isActiveAgent(agentB_)) {
            revert AgentsInactive();
        }

        roomId = roomId_;
        topic = topic_;
        agentA = agentA_;
        agentB = agentB_;
        masterAgent = masterAgent_;
        collateralToken = collateralToken_;
        agentRegistry = agentRegistry_;
        masterAgentGuard = masterAgentGuard_;
        factory = factory_;
        createdAt = uint64(block.timestamp);
        state = RoomState.Created;
    }

    /// @notice Called once by factory after PredictionMarket is deployed.
    function setPredictionMarket(address market) external {
        if (msg.sender != factory && msg.sender != owner()) revert NotFactoryOrOwner(msg.sender);
        if (market == address(0)) revert ZeroAddress();
        if (predictionMarket != address(0)) revert OnlyOnce();
        predictionMarket = market;
    }

    /// @inheritdoc IChatRoom
    function goLive() external onlyMaster inState(RoomState.Created) {
        if (predictionMarket == address(0)) revert MarketNotSet();
        state = RoomState.Live;
        liveAt = uint64(block.timestamp);
        IMasterAgentGuard(masterAgentGuard).heartbeat(roomId);
        emit RoomLive(roomId, masterAgent);
    }

    /// @inheritdoc IChatRoom
    function commitMessageBatch(bytes32 messageRoot) external onlyMaster inState(RoomState.Live) {
        if (messageRoot == bytes32(0)) revert BatchRootEmpty();
        _messageRoots.push(messageRoot);
        // Touch heartbeat on every batch commitment.
        IMasterAgentGuard(masterAgentGuard).heartbeat(roomId);
        emit MessageBatchCommitted(roomId, _messageRoots.length - 1, messageRoot, msg.sender);
    }

    /// @inheritdoc IChatRoom
    function endDebate() external onlyMaster inState(RoomState.Live) {
        state = RoomState.DebateEnded;
        debateEndedAt = uint64(block.timestamp);
        IMasterAgentGuard(masterAgentGuard).heartbeat(roomId);

        // Close linked market for trading.
        IPredictionMarket(predictionMarket).closeMarket();

        emit DebateEnded(roomId, _messageRoots.length);
    }

    /// @inheritdoc IChatRoom
    /// @dev Master or owner settles YES/NO (binary: 0 = YES, 1 = NO). Sole path into market.resolve.
    function settle(uint8 winningOutcome) external inState(RoomState.DebateEnded) {
        if (msg.sender != masterAgent && msg.sender != owner()) {
            revert NotSettlementCaller(msg.sender);
        }
        if (predictionMarket == address(0)) revert MarketNotSet();

        // Binary markets: only 0/1. Multi-outcome: must be < outcomeCount (checked in market).
        uint8 count = IPredictionMarket(predictionMarket).outcomeCount();
        if (winningOutcome >= count) revert InvalidWinningOutcome(winningOutcome);

        // Mark room settled first so market.resolve sees DebateEnded|Settled.
        state = RoomState.Settled;
        IPredictionMarket(predictionMarket).resolve(winningOutcome);

        emit RoomSettled(roomId, winningOutcome);
    }

    /// @notice Cancel the linked market after debate ends (invalid / unclear outcome).
    /// @dev Refunds traders via PredictionMarket.cancel + claim. Room moves to Settled with no winner.
    function cancelSettlement() external inState(RoomState.DebateEnded) {
        if (msg.sender != masterAgent && msg.sender != owner()) {
            revert NotSettlementCaller(msg.sender);
        }
        if (predictionMarket == address(0)) revert MarketNotSet();

        state = RoomState.Settled;
        IPredictionMarket(predictionMarket).cancel();

        emit RoomSettled(roomId, type(uint8).max);
    }

    /// @inheritdoc IChatRoom
    /// @dev Only MasterAgentGuard may rotate master after heartbeat timeout takeover.
    function rotateMaster(address newMaster) external {
        if (msg.sender != masterAgentGuard && msg.sender != owner()) revert NotGuard(msg.sender);
        if (newMaster == address(0)) revert ZeroAddress();
        address old = masterAgent;
        masterAgent = newMaster;
        emit MasterRotated(roomId, old, newMaster);
    }

    /// @notice Master can explicitly heartbeat without committing a batch.
    function heartbeat() external onlyMaster {
        IMasterAgentGuard(masterAgentGuard).heartbeat(roomId);
    }

    /// @inheritdoc IChatRoom
    function config() external view returns (RoomConfig memory) {
        return RoomConfig({
            topic: topic,
            agentA: agentA,
            agentB: agentB,
            masterAgent: masterAgent,
            collateralToken: collateralToken,
            predictionMarket: predictionMarket,
            masterAgentGuard: masterAgentGuard,
            createdAt: createdAt
        });
    }

    /// @inheritdoc IChatRoom
    function getMessageRoot(uint256 batchIndex) external view returns (bytes32) {
        return _messageRoots[batchIndex];
    }

    /// @inheritdoc IChatRoom
    function batchCount() external view returns (uint256) {
        return _messageRoots.length;
    }

    function allMessageRoots() external view returns (bytes32[] memory) {
        return _messageRoots;
    }
}
