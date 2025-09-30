'use client';
import { MiniKitProvider } from '@coinbase/onchainkit/minikit';
import { base } from 'wagmi/chains';

export function MiniKitContextProvider({ children }) {
  return (
    <MiniKitProvider chain={base}>
      {children}
    </MiniKitProvider>
  );
}
