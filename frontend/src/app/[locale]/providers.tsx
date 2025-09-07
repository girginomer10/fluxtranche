'use client';

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { SessionProvider } from 'next-auth/react';
import '@rainbow-me/rainbowkit/styles.css';
import { wagmiConfig } from '@/config/web3';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchInterval: 60 * 1000,
      },
    },
  }));

  return (
    <SessionProvider>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider 
            theme={{
              lightMode: lightTheme({
                accentColor: '#6366f1',
                accentColorForeground: 'white',
                borderRadius: 'large',
                fontStack: 'system',
              }),
              darkMode: darkTheme({
                accentColor: '#8b5cf6',
                accentColorForeground: 'white',
                borderRadius: 'large',
                fontStack: 'system',
              }),
            }}
          >
            {children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </SessionProvider>
  );
}