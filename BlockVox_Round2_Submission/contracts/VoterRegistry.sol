// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract VoterRegistry {
    address public admin;
    mapping(address => bool) public isRegistered;

    event VoterRegistered(address voter);

    constructor() {
        admin = msg.sender;
    }

    function registerVoter(address voter) external {
        require(msg.sender == admin, "Only admin");
        isRegistered[voter] = true;
        emit VoterRegistered(voter);
    }
}