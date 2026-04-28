// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title EternalEcho
 * @dev Implementation of the Eternal Echo test token.
 */
contract EternalEcho is ERC20 {
    constructor() ERC20("Eternal Echo", "ECHO") {
        _mint(msg.sender, 21_000_000 * 10 ** decimals());
    }
}
