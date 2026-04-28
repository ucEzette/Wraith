// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title QuantumPhantom
 * @dev Implementation of the Quantum Phantom test token.
 */
contract QuantumPhantom is ERC20 {
    constructor() ERC20("Quantum Phantom", "QPHAN") {
        _mint(msg.sender, 21_000_000 * 10 ** decimals());
    }
}
