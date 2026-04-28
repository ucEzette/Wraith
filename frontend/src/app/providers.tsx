'use client';

import * as React from 'react';
import {
  RainbowKitProvider,
  getDefaultConfig,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import { wagmiAdapter as config } from './config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';

import { Toaster } from 'react-hot-toast';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({
          accentColor: '#00f0ff',
          accentColorForeground: '#0f131f',
          borderRadius: 'small',
        })}>
          {children}
          <Toaster 
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#0f131f',
                color: '#00f0ff',
                border: '1px solid rgba(0,240,255,0.2)',
                fontSize: '12px',
                fontFamily: 'monospace'
              }
            }}
          />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
