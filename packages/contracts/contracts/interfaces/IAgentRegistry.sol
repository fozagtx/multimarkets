// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgentRegistry {
    struct Agent {
        uint256 id;
        address creator;
        bytes32 personaHash;
        string name;
        string[] tags;
        bool active;
        uint64 registeredAt;
        uint64 updatedAt;
    }

    event AgentRegistered(
        uint256 indexed agentId,
        address indexed creator,
        bytes32 personaHash,
        string name
    );

    event AgentUpdated(
        uint256 indexed agentId,
        address indexed updater,
        bytes32 personaHash,
        string name,
        bool active
    );

    function registerAgent(
        bytes32 personaHash,
        string calldata name,
        string[] calldata tags
    ) external returns (uint256 agentId);

    function updateAgent(
        uint256 agentId,
        bytes32 personaHash,
        string calldata name,
        string[] calldata tags,
        bool active
    ) external;

    function getAgent(uint256 agentId) external view returns (Agent memory);

    function agentCount() external view returns (uint256);

    function isActiveAgent(uint256 agentId) external view returns (bool);
}
