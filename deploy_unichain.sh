#!/bin/bash
source .env
forge script script/DeployUnichain.s.sol:DeployUnichain --rpc-url $UNICHAIN_RPC_URL --broadcast --legacy
