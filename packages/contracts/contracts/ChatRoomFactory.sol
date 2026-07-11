// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ChatRoom} from "./ChatRoom.sol";
import {PredictionMarket} from "./PredictionMarket.sol";
import {IPredictionMarket} from "./interfaces/IPredictionMarket.sol";
import {IMasterAgentGuard} from "./interfaces/IMasterAgentGuard.sol";
import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";

/// @title ChatRoomFactory
/// @notice Deploys linked ChatRoom + PredictionMarket pairs for PersonaPit debates.
contract ChatRoomFactory is Ownable {
    struct CreateRoomParams {
        string topic;
        uint256 agentA;
        uint256 agentB;
        address masterAgent;
        address collateralToken;
        address settlementAuthority;
        address[] backupMasters;
        IPredictionMarket.MarketParams marketParams;
    }

    address public immutable agentRegistry;
    address public masterAgentGuard;
    address public defaultSettlementAuthority;

    uint256 public nextRoomId = 1;

    mapping(uint256 => address) public rooms;
    mapping(uint256 => address) public markets;
    address[] public allRooms;

    event RoomCreated(
        uint256 indexed roomId,
        address indexed room,
        address indexed market,
        address masterAgent,
        address creator,
        string topic
    );
    event MasterAgentGuardUpdated(address indexed oldGuard, address indexed newGuard);
    event DefaultSettlementAuthorityUpdated(address indexed oldAuth, address indexed newAuth);

    error ZeroAddress();
    error InvalidAgents();
    error EmptyTopic();

    constructor(
        address initialOwner,
        address agentRegistry_,
        address masterAgentGuard_,
        address defaultSettlementAuthority_
    ) Ownable(initialOwner) {
        if (
            agentRegistry_ == address(0) || masterAgentGuard_ == address(0)
                || defaultSettlementAuthority_ == address(0)
        ) {
            revert ZeroAddress();
        }
        agentRegistry = agentRegistry_;
        masterAgentGuard = masterAgentGuard_;
        defaultSettlementAuthority = defaultSettlementAuthority_;
    }

    function setMasterAgentGuard(address newGuard) external onlyOwner {
        if (newGuard == address(0)) revert ZeroAddress();
        address old = masterAgentGuard;
        masterAgentGuard = newGuard;
        emit MasterAgentGuardUpdated(old, newGuard);
    }

    function setDefaultSettlementAuthority(address newAuth) external onlyOwner {
        if (newAuth == address(0)) revert ZeroAddress();
        address old = defaultSettlementAuthority;
        defaultSettlementAuthority = newAuth;
        emit DefaultSettlementAuthorityUpdated(old, newAuth);
    }

    /// @notice Create a chat room and its linked prediction market.
    function createRoom(CreateRoomParams calldata params)
        external
        returns (uint256 roomId, address room, address market)
    {
        if (bytes(params.topic).length == 0) revert EmptyTopic();
        if (params.masterAgent == address(0) || params.collateralToken == address(0)) {
            revert ZeroAddress();
        }
        if (params.agentA == params.agentB) revert InvalidAgents();

        IAgentRegistry registry = IAgentRegistry(agentRegistry);
        if (!registry.isActiveAgent(params.agentA) || !registry.isActiveAgent(params.agentB)) {
            revert InvalidAgents();
        }

        roomId = nextRoomId++;
        address settlement =
            params.settlementAuthority == address(0)
                ? defaultSettlementAuthority
                : params.settlementAuthority;

        ChatRoom chatRoom = new ChatRoom(
            owner(),
            roomId,
            params.topic,
            params.agentA,
            params.agentB,
            params.masterAgent,
            params.collateralToken,
            agentRegistry,
            masterAgentGuard,
            address(this)
        );
        room = address(chatRoom);

        PredictionMarket predictionMarket = new PredictionMarket(
            owner(),
            room,
            params.collateralToken,
            settlement,
            params.marketParams
        );
        market = address(predictionMarket);

        chatRoom.setPredictionMarket(market);

        // Register room with guard for heartbeat / takeover (factory must be authorized).
        IMasterAgentGuard(masterAgentGuard).registerRoom(roomId, params.masterAgent, room);

        for (uint256 i = 0; i < params.backupMasters.length; ) {
            if (params.backupMasters[i] != address(0)) {
                IMasterAgentGuard(masterAgentGuard).registerBackupMaster(roomId, params.backupMasters[i]);
            }
            unchecked {
                ++i;
            }
        }

        rooms[roomId] = room;
        markets[roomId] = market;
        allRooms.push(room);

        emit RoomCreated(roomId, room, market, params.masterAgent, msg.sender, params.topic);
    }

    function roomCount() external view returns (uint256) {
        return allRooms.length;
    }

    function getRoomPair(uint256 roomId) external view returns (address room, address market) {
        return (rooms[roomId], markets[roomId]);
    }
}
