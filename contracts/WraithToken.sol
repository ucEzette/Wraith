// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title WraithTestToken
 * @notice A test token for Wraith Protocol toxicity simulation.
 *         Contains a selfdestruct function to trigger "Malicious Bytecode" detection.
 */
contract WraithToken is ERC20, Ownable {
    constructor() ERC20("Wraith Test Token", "WRAITH") Ownable(msg.sender) {
        _mint(msg.sender, 1000000 * 10**decimals());
    }

    /**
     * @notice Malicious function used to simulate a rug-pull.
     *         The presence of 'selfdestruct' opcode (0xff) will be detected by Sentinel.
     */
    function emergencyExit() external onlyOwner {
        selfdestruct(payable(owner()));
    }
}
