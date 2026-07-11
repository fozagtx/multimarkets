// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";

/// @title AgentRegistry
/// @notice On-chain registry of AI persona agents for MultiMarkets.
/// @dev personaHash is typically a keccak256 or IPFS content hash of Eliza character JSON.
contract AgentRegistry is IAgentRegistry, Ownable {
    uint256 private _nextAgentId = 1;

    mapping(uint256 => Agent) private _agents;
    mapping(address => uint256[]) private _creatorAgents;

    error InvalidPersonaHash();
    error EmptyName();
    error AgentNotFound(uint256 agentId);
    error NotAuthorized(address caller, uint256 agentId);

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @inheritdoc IAgentRegistry
    function registerAgent(
        bytes32 personaHash,
        string calldata name,
        string[] calldata tags
    ) external returns (uint256 agentId) {
        if (personaHash == bytes32(0)) revert InvalidPersonaHash();
        if (bytes(name).length == 0) revert EmptyName();

        agentId = _nextAgentId++;
        Agent storage agent = _agents[agentId];
        agent.id = agentId;
        agent.creator = msg.sender;
        agent.personaHash = personaHash;
        agent.name = name;
        agent.active = true;
        agent.registeredAt = uint64(block.timestamp);
        agent.updatedAt = uint64(block.timestamp);

        for (uint256 i = 0; i < tags.length; ) {
            agent.tags.push(tags[i]);
            unchecked {
                ++i;
            }
        }

        _creatorAgents[msg.sender].push(agentId);

        emit AgentRegistered(agentId, msg.sender, personaHash, name);
    }

    /// @inheritdoc IAgentRegistry
    function updateAgent(
        uint256 agentId,
        bytes32 personaHash,
        string calldata name,
        string[] calldata tags,
        bool active
    ) external {
        Agent storage agent = _agents[agentId];
        if (agent.id == 0) revert AgentNotFound(agentId);
        if (msg.sender != owner() && msg.sender != agent.creator) {
            revert NotAuthorized(msg.sender, agentId);
        }
        if (personaHash == bytes32(0)) revert InvalidPersonaHash();
        if (bytes(name).length == 0) revert EmptyName();

        agent.personaHash = personaHash;
        agent.name = name;
        agent.active = active;
        agent.updatedAt = uint64(block.timestamp);

        delete agent.tags;
        for (uint256 i = 0; i < tags.length; ) {
            agent.tags.push(tags[i]);
            unchecked {
                ++i;
            }
        }

        emit AgentUpdated(agentId, msg.sender, personaHash, name, active);
    }

    /// @inheritdoc IAgentRegistry
    function getAgent(uint256 agentId) external view returns (Agent memory) {
        Agent memory agent = _agents[agentId];
        if (agent.id == 0) revert AgentNotFound(agentId);
        return agent;
    }

    /// @inheritdoc IAgentRegistry
    function agentCount() external view returns (uint256) {
        return _nextAgentId - 1;
    }

    /// @inheritdoc IAgentRegistry
    function isActiveAgent(uint256 agentId) external view returns (bool) {
        Agent storage agent = _agents[agentId];
        return agent.id != 0 && agent.active;
    }

    /// @notice Returns agent ids created by `creator`.
    function agentsOf(address creator) external view returns (uint256[] memory) {
        return _creatorAgents[creator];
    }
}
