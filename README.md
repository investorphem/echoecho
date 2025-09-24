# EchoEcho - AI-Powered Echo Chamber Breaker

## Overview

EchoEcho is a Farcaster mini app designed to break echo chambers by finding and presenting counter-narratives to trending topics. The application analyzes trending Farcaster casts, uses AI to identify dominant viewpoints, and helps users discover diverse perspectives from both within Farcaster and external platforms like Twitter/X and news sources. Users can "echo" these counter-narratives back to Farcaster and mint NFT "Insight Tokens" to commemorate their echo chamber breaking activities.

The app operates on a freemium model with monetization through premium subscriptions, NFT minting fees, and potential protocol partnerships.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Next.js 14 with React 18 for server-side rendering and optimal performance
- **UI Pattern**: Single-page application with multiple views (trends, echoes, premium features, FAQ) managed through state
- **Responsive Design**: Mobile-first approach targeting Farcaster's mobile-heavy user base
- **Real-time Updates**: Client-side polling for trending topics and echo updates

### Backend Architecture
- **API Routes**: Next.js API routes for all backend functionality
- **Service Architecture**: Modular API endpoints for distinct features:
  - `/api/trending` - Fetches trending Farcaster casts
  - `/api/ai-analysis` - AI sentiment and viewpoint analysis
  - `/api/cross-platform` - External platform data aggregation
  - `/api/echo` - Farcaster interaction (recasting)
  - `/api/mint-nft` - NFT minting for Insight Tokens
  - `/api/monetization` - Premium tier management
- **AI Integration**: OpenAI GPT-3.5-turbo for sentiment analysis and counter-narrative discovery
- **Cross-Platform Data**: Multi-source aggregation from Twitter, news APIs, and potentially other social platforms

### Data Flow
1. Trending topics fetched from Neynar (Farcaster hub)
2. AI analysis applied to identify dominant sentiment/viewpoint
3. Cross-platform search for counter-narratives
4. User interaction triggers either direct echoing or NFT minting
5. Premium features gated through tier verification

### Authentication & User Management
- **Wallet-Based Auth**: Ethereum wallet connection for user identification
- **Farcaster Integration**: Direct integration with Farcaster accounts
- **Tier Management**: User subscription tiers (Free, Premium, Pro) with feature gating

### Monetization Architecture
- **Freemium Model**: Basic features free, advanced features behind paywall
- **NFT Economy**: Insight Tokens with rarity-based pricing
- **USDC Payments**: Base network integration for subscription payments
- **Revenue Sharing**: Future partnerships with content platforms

## External Dependencies

### Core Social Platform APIs
- **Neynar API**: Primary Farcaster data source for trending casts and user interactions
- **Twitter/X API v2**: Cross-platform content discovery with bearer token authentication
- **NewsAPI**: External news source integration for broader perspective discovery

### AI and Machine Learning
- **OpenAI API**: GPT-3.5-turbo for sentiment analysis, viewpoint identification, and counter-narrative generation
- **Custom AI Prompts**: Specialized prompts for social media sentiment analysis and bias detection

### Blockchain Infrastructure
- **Viem**: Ethereum interaction library for wallet connections and smart contract interactions
- **Wagmi**: React hooks for Ethereum wallet integration
- **Base Network**: Layer 2 solution for low-cost NFT minting and USDC payments
- **USDC Contract**: Stablecoin payments for premium subscriptions

### Development and Deployment
- **Next.js**: Full-stack React framework with API routes
- **Vercel**: Deployment platform optimized for Next.js applications
- **Node-fetch**: HTTP client for external API calls

### Content and Media
- **DiceBear API**: Procedural avatar generation for NFT imagery
- **Farcaster Protocol**: Native mini-app integration with proper manifest configuration

### Environment Configuration
Required environment variables:
- `NEYNAR_API_KEY`: Farcaster data access
- `OPENAI_API_KEY`: AI analysis capabilities  
- `X_BEARER_TOKEN`: Twitter/X content access
- `NEWS_API_KEY`: News content aggregation

The architecture emphasizes modularity and scalability, allowing for easy addition of new content sources and monetization features while maintaining performance and user experience standards expected in the Farcaster ecosystem.
