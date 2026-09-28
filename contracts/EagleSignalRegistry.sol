// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EagleSignalRegistry
 * @notice Minimal, institutional-grade on-chain commitment registry for EAGLE FLASH / SIGMA signals.
 * Anchors canonical signal event hashes (SHA-256 / Keccak-256) immutably on-chain to provide
 * mathematically verifiable proof of signal creation, dynamic TP/SL levels, and execution milestones.
 */
contract EagleSignalRegistry {
    address public owner;
    mapping(address => bool) public authorizedPublishers;

    struct Commitment {
        bytes32 eventHash;
        uint64 blockNumber;
        uint64 timestamp;
        address publisher;
    }

    // Mapping: signalIdHash => Commitment
    mapping(bytes32 => Commitment) public signalCommitments;

    // Mapping: signalIdHash => eventTypeHash => Commitment
    mapping(bytes32 => mapping(bytes32 => Commitment)) public lifecycleCommitments;

    // Events
    event SignalCommitted(
        bytes32 indexed signalIdHash,
        bytes32 indexed eventHash,
        address indexed publisher,
        uint64 blockNumber,
        uint64 timestamp
    );

    event LifecycleCommitted(
        bytes32 indexed signalIdHash,
        bytes32 indexed eventTypeHash,
        bytes32 indexed eventHash,
        address publisher,
        uint64 blockNumber,
        uint64 timestamp
    );

    event PublisherUpdated(address indexed publisher, bool authorized);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "EagleRegistry: caller is not the owner");
        _;
    }

    modifier onlyAuthorized() {
        require(msg.sender == owner || authorizedPublishers[msg.sender], "EagleRegistry: unauthorized publisher");
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedPublishers[msg.sender] = true;
    }

    function setPublisher(address publisher, bool authorized) external onlyOwner {
        require(publisher != address(0), "EagleRegistry: zero address");
        authorizedPublishers[publisher] = authorized;
        emit PublisherUpdated(publisher, authorized);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "EagleRegistry: zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @notice Registers initial canonical signal proof hash.
     * @param signalIdHash Keccak256 hash of canonical signal_id (e.g. EGL-20260928-BYBIT-BTCUSDT-XXXX)
     * @param eventHash SHA-256 hash of deterministic canonical signal payload
     */
    function registerSignalHash(bytes32 signalIdHash, bytes32 eventHash) external onlyAuthorized {
        require(signalCommitments[signalIdHash].timestamp == 0, "EagleRegistry: signal already committed");
        require(eventHash != bytes32(0), "EagleRegistry: empty event hash");

        Commitment memory commitment = Commitment({
            eventHash: eventHash,
            blockNumber: uint64(block.number),
            timestamp: uint64(block.timestamp),
            publisher: msg.sender
        });

        signalCommitments[signalIdHash] = commitment;

        emit SignalCommitted(
            signalIdHash,
            eventHash,
            msg.sender,
            uint64(block.number),
            uint64(block.timestamp)
        );
    }

    /**
     * @notice Registers lifecycle milestone event hash (e.g. TP1_HIT, STOP_HIT).
     */
    function registerSignalEvent(
        bytes32 signalIdHash,
        bytes32 eventTypeHash,
        bytes32 eventHash
    ) external onlyAuthorized {
        require(eventHash != bytes32(0), "EagleRegistry: empty event hash");

        Commitment memory commitment = Commitment({
            eventHash: eventHash,
            blockNumber: uint64(block.number),
            timestamp: uint64(block.timestamp),
            publisher: msg.sender
        });

        lifecycleCommitments[signalIdHash][eventTypeHash] = commitment;

        emit LifecycleCommitted(
            signalIdHash,
            eventTypeHash,
            eventHash,
            msg.sender,
            uint64(block.number),
            uint64(block.timestamp)
        );
    }

    /**
     * @notice Verifies cryptographic commitment for initial signal creation.
     */
    function verifyCommitment(
        bytes32 signalIdHash,
        bytes32 expectedHash
    ) external view returns (bool isVerified, uint64 blockNumber, uint64 timestamp, address publisher) {
        Commitment memory c = signalCommitments[signalIdHash];
        if (c.timestamp != 0 && c.eventHash == expectedHash) {
            return (true, c.blockNumber, c.timestamp, c.publisher);
        }
        return (false, c.blockNumber, c.timestamp, c.publisher);
    }

    /**
     * @notice Verifies cryptographic commitment for a lifecycle milestone event.
     */
    function verifyEventCommitment(
        bytes32 signalIdHash,
        bytes32 eventTypeHash,
        bytes32 expectedHash
    ) external view returns (bool isVerified, uint64 blockNumber, uint64 timestamp, address publisher) {
        Commitment memory c = lifecycleCommitments[signalIdHash][eventTypeHash];
        if (c.timestamp != 0 && c.eventHash == expectedHash) {
            return (true, c.blockNumber, c.timestamp, c.publisher);
        }
        return (false, c.blockNumber, c.timestamp, c.publisher);
    }
}
