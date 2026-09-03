// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title Governance
/// @notice Minimal token-weighted governance skeleton for the PoC.
/// @dev Production governance should use OpenZeppelin Governor + Timelock.
contract Governance is AccessControl {
    IERC20 public immutable vmind;

    struct Proposal {
        address target;
        bytes callData;
        uint256 forVotes;
        uint256 deadline;
        bool executed;
        mapping(address => bool) hasVoted;
    }

    uint256 public proposalCount;
    uint256 public votingPeriod;
    uint256 public quorum;

    mapping(uint256 => Proposal) private proposals;
    mapping(address => bool) public allowedTarget;

    event ProposalCreated(
        uint256 indexed id,
        address indexed target,
        uint256 deadline
    );
    event Voted(
        uint256 indexed id,
        address indexed voter,
        uint256 weight
    );
    event ProposalExecuted(uint256 indexed id);
    event TargetAllowed(address indexed target, bool allowed);

    constructor(
        address vmindToken,
        uint256 _votingPeriod,
        uint256 _quorum
    ) {
        require(vmindToken != address(0), "zero address");
        require(_votingPeriod > 0, "invalid voting period");
        require(_quorum > 0, "invalid quorum");

        vmind = IERC20(vmindToken);
        votingPeriod = _votingPeriod;
        quorum = _quorum;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setAllowedTarget(
        address target,
        bool allowed
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(target != address(0), "zero target");
        allowedTarget[target] = allowed;
        emit TargetAllowed(target, allowed);
    }

    function propose(
        address target,
        bytes calldata callData
    ) external returns (uint256 id) {
        require(allowedTarget[target], "target not allowed");

        id = proposalCount++;

        Proposal storage p = proposals[id];
        p.target = target;
        p.callData = callData;
        p.deadline = block.timestamp + votingPeriod;

        emit ProposalCreated(id, target, p.deadline);
    }

    function vote(uint256 id) external {
        Proposal storage p = proposals[id];

        require(p.target != address(0), "proposal not found");
        require(block.timestamp < p.deadline, "voting closed");
        require(!p.hasVoted[msg.sender], "already voted");

        uint256 weight = vmind.balanceOf(msg.sender);
        require(weight > 0, "no voting power");

        p.hasVoted[msg.sender] = true;
        p.forVotes += weight;

        emit Voted(id, msg.sender, weight);
    }

    function execute(uint256 id) external {
        Proposal storage p = proposals[id];

        require(p.target != address(0), "proposal not found");
        require(block.timestamp >= p.deadline, "voting still open");
        require(!p.executed, "already executed");
        require(p.forVotes >= quorum, "quorum not met");
        require(allowedTarget[p.target], "target no longer allowed");

        p.executed = true;

        (bool success, ) = p.target.call(p.callData);
        require(success, "execution failed");

        emit ProposalExecuted(id);
    }
}
