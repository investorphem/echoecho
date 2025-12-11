// components/MiniAppSDK.tsx   ← NEW FILE
'use client';

import { useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export default function MiniAppSDK({
  onReady,
  onUser 
}: {
  onReady?: () => void
  onUser?: (data: any) => void;
}) {l
  useEffect(() => {
    // 1. THIS REMOVES THE SPLASH SCREEN — MUST BE FIRST
    sdk.actions.ready().catch(() => {});
    // 2. Optional: get user data safely
    const getUser = async () => {
      try {
       cons context=awaitkgetLocationContext(.catch(()=>({}));cstuser = await sdk.getUser().catch(() => {}));       onUser?.({ ...user, context })
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
