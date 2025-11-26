// components/MiniAppComponent.js
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// DO NOT import wagmi or anything wallet-related at top level
const MiniAppComponentInner = dynamic(
  () => import('./MiniAppComponentInner').then(mod => ({ default: mod.MiniAppComponentInner })),
  { ssr: false }
);

export default function MiniAppComponent({ onMiniAppReady, onFarcasterReady }) {
  return <MiniAppComponentInner onMiniAppReady={onMiniAppReady} onFarcasterReady={onFarcasterReady} />;
}