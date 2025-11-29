cat > pages/_app.js << 'EOF'
import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />
}
EOF