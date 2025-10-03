export default function MiniAppComponent({
  walletConnected, // ← Remove if unused
  walletAddress,   // ← Remove if unused
  onMiniAppReady,
  onFarcasterReady,
}) {
  const [error, setError] = useState(null);
  const { signMessageAsync } = useSignMessage();

  useEffect(() => {
    const init = async () => {
      try {
        // Detect if running inside Warpcast Mini App
        const isMiniApp = await sdk.isInMiniApp();
        if (!isMiniApp) {
          setError('Not running in a Farcaster client. Please use Warpcast.');
          onMiniAppReady?.();
          onFarcasterReady?.(null);
          return;
        }

        // Signal SDK ready
        try {
          await sdk.actions.ready();
        } catch (err) {
          setError(`Failed to signal SDK ready: ${err.message}`);
          onMiniAppReady?.();
          onFarcasterReady?.(null);
          return;
        }

        // Attempt automatic connection
        try {
          const user = await sdk.getUser?.();
          let address, username;

          if (user && user.address) {
            address = user.address;
            username = user.username || 'unknown';
          } else {
            setError('No wallet connected in Warpcast. Please log in.');
            onFarcasterReady?.(null);
            return;
          }

          // Generate and sign message for authentication
          const message = `Login to EchoEcho at ${new Date().toISOString()}`;
          let signature;
          try {
            signature = await signMessageAsync({ message });
          } catch (signError) {
            setError(`Signature failed: ${signError.message}`);
            onFarcasterReady?.(null);
            return;
          }

          // Send to /api/me
          const response = await fetch('/api/me', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, signature, address, username }),
          });

          if (response.ok) {
            const userData = await response.json();
            onFarcasterReady?.({
              username: userData.username,
              address: userData.address,
              token: userData.token,
              tier: userData.tier || 'free',
              subscription: userData.subscription || null,
            });
          } else {
            const errorData = await response.json();
            setError(`Authentication failed: ${errorData.error || 'Unknown error'}`);
            onFarcasterReady?.(null);
          }
        } catch (error) {
          setError(`Authentication error: ${error.message}`);
          onFarcasterReady?.(null);
        }

        onMiniAppReady?.();
      } catch (err) {
        setError(`Initialization error: ${err.message}`);
        onMiniAppReady?.();
        onFarcasterReady?.(null);
      }
    };

    init();
  }, [signMessageAsync, onMiniAppReady, onFarcasterReady]);

  return error ? <div style={{ color: 'red' }}>Error: {error}</div> : null;
}
