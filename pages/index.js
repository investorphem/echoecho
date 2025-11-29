// pages/index.js
'use client';

import { useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export default function Home() {
  useEffect(() => {
    // THIS IS THE ONLY LINE THAT MATTERS
    sdk.actions.ready().catch(() => {});
    
    console.log('ready() called — Warpcast will now show the app');
  }, []);

  return (
    <div style={{
      background: '#111827',
      color: '#fff',
      minHeight: '100vh',
      padding: 40,
      textAlign: 'center',
      fontFamily: 'system-ui',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <h1 style={{fontSize: 56, marginBottom: 30}}>EchoEcho</h1>
      
      <div style={{
        background: '#10b981',
        color: 'white',
        padding: '50px 80px',
        borderRadius: 32,
        fontSize: 48,
        fontWeight: 'bold',
        boxShadow: '0 20px 50px rgba(16, 185, 129, 0.4)'
      }}>
        IT'S ALIVE!
      </div>

      <p style={{marginTop: 50, fontSize: 28}}>
        Reply <strong style={{color:'#fbbf24'}}>“I SEE IT”</strong> right now
      </p>
      
      <p style={{marginTop: 20, color:'#94a3b8', fontSize: 18}}>
        No wallet connect<br/>
        No wagmi<br/>
        No MiniAppComponent<br/>
        Just <code>sdk.actions.ready()</code>
      </p>
    </div>
  );
}