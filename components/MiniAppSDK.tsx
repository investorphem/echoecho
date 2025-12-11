// components/MiniAppSDK.tsx   ← NEW FIL
'use client';
import { useEffect } from 'react';
import { sdk } from '@farcaster/miniap-sdk'
export default function MiniAp
  onReady,
  onUser 
}: {
  onReady?: () => voi
  onUser?: (data: any) => void;
}) 
  useEffect(() => 
    // 1. THIS REMOVES THE SPLASH SCREEN — MUST BE FIRST
    sdk.actions.ready().catch(() => {});
    // 2. Optional: get user data safely
    const getUser = async () => {
      try 
       cons context=awaitkgetLocationContet(.catch()=>({}));cstuser = await sdk.getUser().catch(> {}));       onUser?.({ ...user, context })
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
