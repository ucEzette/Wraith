import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { unichainSepolia, foundry } from 'wagmi/chains';

export const wagmiAdapter = getDefaultConfig({
  appName: 'Wraith Protocol',
  projectId: 'a4b160ffca32cc295f70a5c4bc3557e0', // Placeholder project ID for dev
  chains: [unichainSepolia, foundry],
  ssr: true,
});
