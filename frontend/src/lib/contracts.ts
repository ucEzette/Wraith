import WraithHookABI from './WraithHookABI.json';

// Deployed on Unichain Sepolia with 0x280 suffix for v4 hook permissions
export const WRAITH_HOOK_ADDRESS = '0xD56388a4ce5Cd9E236201AD3DF27Edfbb28E0280'; 

export const wraithHookConfig = {
  address: WRAITH_HOOK_ADDRESS as `0x${string}`,
  abi: WraithHookABI,
};

export const POOL_MANAGER_ADDRESS = '0x00B036B58a818B1BC34d502D3fE730Db729e62AC'; 

// Minimal PoolManager ABI for operator approvals (ERC-6909)
// Users must call setOperator(wraith_hook, true) to allow the protocol
// to remove their liquidity during a Quantum Auto-Exit rescue.
export const POOL_MANAGER_ABI = [
  {
    type: 'function',
    name: 'setOperator',
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'approved', type: 'bool' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'isOperator',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'operator', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
] as const;

export const poolManagerConfig = {
  address: POOL_MANAGER_ADDRESS as `0x${string}`,
  abi: POOL_MANAGER_ABI,
};
