// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMasterAgentGuard {
    event Heartbeat(uint256 indexed roomId, address indexed master, uint64 timestamp);
    event BackupMasterRegistered(uint256 indexed roomId, address indexed backup);
    event BackupMasterRemoved(uint256 indexed roomId, address indexed backup);
    event MasterTakeover(
        uint256 indexed roomId,
        address indexed previousMaster,
        address indexed newMaster
    );
    event HeartbeatTimeoutUpdated(uint256 oldTimeout, uint256 newTimeout);

    function registerRoom(uint256 roomId, address master, address controller) external;

    function heartbeat(uint256 roomId) external;

    function registerBackupMaster(uint256 roomId, address backup) external;

    function removeBackupMaster(uint256 roomId, address backup) external;

    function takeover(uint256 roomId, address chatRoom) external;

    function lastHeartbeat(uint256 roomId) external view returns (uint64);

    function isHeartbeatStale(uint256 roomId) external view returns (bool);

    function isBackupMaster(uint256 roomId, address account) external view returns (bool);

    function currentMaster(uint256 roomId) external view returns (address);

    function HEARTBEAT_TIMEOUT() external view returns (uint256);
}
