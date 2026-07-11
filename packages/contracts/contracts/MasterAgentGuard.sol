// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IMasterAgentGuard} from "./interfaces/IMasterAgentGuard.sol";
import {IChatRoom} from "./interfaces/IChatRoom.sol";

/// @title MasterAgentGuard
/// @notice Tracks master-agent heartbeats per room and enables backup takeover after timeout.
contract MasterAgentGuard is IMasterAgentGuard, Ownable {
    /// @notice Default heartbeat staleness window (10 minutes).
    uint256 public HEARTBEAT_TIMEOUT = 10 minutes;

    mapping(uint256 => address) private _currentMaster;
    mapping(uint256 => uint64) private _lastHeartbeat;
    mapping(uint256 => mapping(address => bool)) private _backupMasters;
    /// @dev ChatRoom (or other controller) authorized to heartbeat on behalf of the master.
    mapping(uint256 => address) private _roomControllers;
    /// @dev Factories allowed to register rooms and backup masters.
    mapping(address => bool) public authorizedFactories;

    error ZeroAddress();
    error NotMaster(address caller, uint256 roomId);
    error NotBackupMaster(address caller, uint256 roomId);
    error HeartbeatNotStale(uint256 roomId);
    error NotAuthorized(address caller);
    error RoomAlreadyRegistered(uint256 roomId);

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Authorize / deauthorize a ChatRoomFactory (or other registrar).
    function setFactoryAuthorization(address factory, bool authorized) external onlyOwner {
        if (factory == address(0)) revert ZeroAddress();
        authorizedFactories[factory] = authorized;
    }

    /// @notice Register a room with its initial master and controller (ChatRoom address).
    function registerRoom(uint256 roomId, address master, address controller) external {
        if (master == address(0) || controller == address(0)) revert ZeroAddress();
        if (msg.sender != owner() && !authorizedFactories[msg.sender]) {
            revert NotAuthorized(msg.sender);
        }
        if (_roomControllers[roomId] != address(0)) revert RoomAlreadyRegistered(roomId);

        _roomControllers[roomId] = controller;
        _currentMaster[roomId] = master;
        _lastHeartbeat[roomId] = uint64(block.timestamp);

        emit Heartbeat(roomId, master, uint64(block.timestamp));
    }

    /// @notice Owner can overwrite room controller if a room is redeployed/migrated.
    function setRoomController(uint256 roomId, address controller) external onlyOwner {
        if (controller == address(0)) revert ZeroAddress();
        _roomControllers[roomId] = controller;
    }

    /// @inheritdoc IMasterAgentGuard
    /// @dev Callable by the current master EOA/agent or the room controller (ChatRoom).
    function heartbeat(uint256 roomId) external {
        address master = _currentMaster[roomId];
        if (msg.sender != master && msg.sender != _roomControllers[roomId]) {
            revert NotMaster(msg.sender, roomId);
        }
        _lastHeartbeat[roomId] = uint64(block.timestamp);
        emit Heartbeat(roomId, master, uint64(block.timestamp));
    }

    /// @inheritdoc IMasterAgentGuard
    function registerBackupMaster(uint256 roomId, address backup) external {
        if (backup == address(0)) revert ZeroAddress();
        if (!_isRoomAdmin(roomId, msg.sender)) revert NotAuthorized(msg.sender);
        _backupMasters[roomId][backup] = true;
        emit BackupMasterRegistered(roomId, backup);
    }

    /// @inheritdoc IMasterAgentGuard
    function removeBackupMaster(uint256 roomId, address backup) external {
        if (!_isRoomAdmin(roomId, msg.sender)) revert NotAuthorized(msg.sender);
        _backupMasters[roomId][backup] = false;
        emit BackupMasterRemoved(roomId, backup);
    }

    /// @inheritdoc IMasterAgentGuard
    function takeover(uint256 roomId, address chatRoom) external {
        if (!_backupMasters[roomId][msg.sender]) revert NotBackupMaster(msg.sender, roomId);
        if (!isHeartbeatStale(roomId)) revert HeartbeatNotStale(roomId);
        if (chatRoom == address(0)) revert ZeroAddress();

        address previous = _currentMaster[roomId];
        _currentMaster[roomId] = msg.sender;
        _lastHeartbeat[roomId] = uint64(block.timestamp);

        IChatRoom(chatRoom).rotateMaster(msg.sender);

        emit MasterTakeover(roomId, previous, msg.sender);
        emit Heartbeat(roomId, msg.sender, uint64(block.timestamp));
    }

    /// @notice Owner can update HEARTBEAT_TIMEOUT.
    function setHeartbeatTimeout(uint256 newTimeout) external onlyOwner {
        require(newTimeout >= 1 minutes, "timeout too short");
        uint256 old = HEARTBEAT_TIMEOUT;
        HEARTBEAT_TIMEOUT = newTimeout;
        emit HeartbeatTimeoutUpdated(old, newTimeout);
    }

    /// @inheritdoc IMasterAgentGuard
    function lastHeartbeat(uint256 roomId) external view returns (uint64) {
        return _lastHeartbeat[roomId];
    }

    /// @inheritdoc IMasterAgentGuard
    function isHeartbeatStale(uint256 roomId) public view returns (bool) {
        uint64 last = _lastHeartbeat[roomId];
        if (last == 0) return true;
        return block.timestamp > uint256(last) + HEARTBEAT_TIMEOUT;
    }

    /// @inheritdoc IMasterAgentGuard
    function isBackupMaster(uint256 roomId, address account) external view returns (bool) {
        return _backupMasters[roomId][account];
    }

    /// @inheritdoc IMasterAgentGuard
    function currentMaster(uint256 roomId) external view returns (address) {
        return _currentMaster[roomId];
    }

    function roomController(uint256 roomId) external view returns (address) {
        return _roomControllers[roomId];
    }

    function _isRoomAdmin(uint256 roomId, address account) internal view returns (bool) {
        return account == owner() || account == _currentMaster[roomId]
            || account == _roomControllers[roomId] || authorizedFactories[account];
    }
}
