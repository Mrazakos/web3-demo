// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SimpleStorage
 * @dev Simple contract to store, retrieve, and track string value changes on-chain
 */
contract SimpleStorage {
    string private storedValue;

    // Event emitted whenever storedValue is changed
    event ValueUpdated(address indexed updater, string newValue);

    /**
     * @dev Sets initial value upon deployment
     * @param initialValue The starting string value
     */
    constructor(string memory initialValue) {
        storedValue = initialValue;
    }

    /**
     * @dev Update the stored value on-chain (costs gas)
     * @param newValue The new string value to store
     */
    function set(string memory newValue) public {
        storedValue = newValue;
        emit ValueUpdated(msg.sender, newValue);
    }

    /**
     * @dev Retrieve the stored value (read-only, free / no gas)
     * @return The currently stored string value
     */
    function get() public view returns (string memory) {
        return storedValue;
    }
}
