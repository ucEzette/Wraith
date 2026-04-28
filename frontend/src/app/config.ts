import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { unichainSepolia, foundry } from 'wagmi/chains';

export const wagmiAdapter = getDefaultConfig({
  appName: 'Wraith Protocol',
  projectId: 'b836846042834ada8c273074c588bfff', // User project ID
  chains: [unichainSepolia, foundry],
  ssr: true,
});
