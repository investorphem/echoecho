// pages/index.js
'use client';

import { useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-dk'
export default function Home() {
  useEffect(() => 
    // THIS LINE REMOVES THE SPLA
    sdk.actions.ready().catchcose.error);
    // Optional: log so you kno a
    console.log('ready() called — splash screen will disappear now'
  }, []

  return (
    <div style={{
      background: '#111827'
      color: '#fff'
      minHeight: '100v
      padding: 40,
      textAlign: 'center',
      fontFamily: 'system-ui',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 30
    }}>
      <h1 style={{fontSize: 64, margin: 0}}>EchoEcho</h1>

      <div style={{
        background: '#10b981',
        color: 'white',
        padding: '60px 100px',
        borderRadius: 40,
        fontSize: 56,
        fontWeight: 'bold',
        boxShadow: '0 30px 80px rgba(16,185,129,0.5)'
      }}>
        IT WORKS!
      </div>

      <p style={{fontSize: 32, margin: 0}}>
        Reply <strong style={{color:'#fbbf24'}}>I SEE IT</strong> right now
      </p>

      <p style={{color:'#94a3b8', fontSize: 18, marginTop: 40}}>
        No wagmi · No wallet connect · No MiniAppComponent<br/>
        Only one line: <code>sdk.actions.ready()</code>
      </p>
    </div>
  );
}