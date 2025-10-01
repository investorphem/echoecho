'use client';
import { MiniKit } from '@coinbase/onchainkit'; // <-- Import corrected
import { base } from 'wagmi/chains';

export function MiniKitContextProvider({ children }) {
  return (
    <MiniKit chain={base}>
      {children}
    </MiniKit>
  );
}
