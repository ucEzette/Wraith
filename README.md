# Wraith Protocol — Active Defense for Uniswap v4

> *An AI bodyguard that's faster than the scammer.*

Wraith is an autonomous **Active Defense** protocol that protects Uniswap v4 LPs from rug-pulls and malicious exploits. It bridges **Decentralized AI (Gensyn)**, **Intent-based Automation (KeeperHub)**, and **Next-Gen Liquidity (Uniswap v4 Hooks)**.

## Features

- **Poison Hook** — 99% fee for flagged attackers, 0% for protected users
- **Quantum Exit** — Atomic LP rescue: remove liquidity → swap to stables → vault deposit
- **Sovereign Override** — Manual emergency exit failsafe with cooldown
- **MEV Capture** — Back-run attacker txs to fund operations
- **EIP-1153** — Transient storage for gas-efficient per-block toxicity state

## Project Structure

```
contracts/WraithHook.sol      — Core v4 Hook with Active Defense logic
agents/sentinel.py            — Gensyn AEL toxicity model + mempool monitor
scripts/keeper_relay.js       — KeeperHub Flash-Rescue automation
test/WraithGuard.t.sol        — Foundry test suite (31 tests, 256 fuzz runs)
```

## Quick Start

```bash
forge install
forge build
forge test -vvv
```

## License

MIT
