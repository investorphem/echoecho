// components/MiniAppSDK.tsx   ← NEW FILE
'use client';

import { useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export default function MiniAppSDK({ 
  onReady, 
  onUser 
}: { 
  onReady?: () => void;
  onUser?: (data: any) => void;
}) {
  useEffect(() => {
    // 
    sdk.actions.ready().catch(() => {});

    // 2. Optional: get us
    const getUser = async () => {
      try {
        const context = await sdk.getLocationContext().catch(() => ({}));
        const user = await sdk.getUser().catch(() => ({}));
        onUser?.({ ...user, context });
      } catch (e) {
        onUser?.({ error: e.message });
      }
    };

    getUser();
    onReady?.();
  }, [onReady, onUser]);

  // This component renders nothing
  return null;
}