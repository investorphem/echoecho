#!/bin/bash

# EchoEcho Protocol - Development Setup Script
echo "🚀 Setting up EchoEcho Protocol development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 22.x first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d"." -f1 | cut -d"v" -f2)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo "❌ Node.js version 22.x is required. Current version: $(node -v)"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env exists, if not create from .env.example
if [ -f ".env.example" ] && [ ! -f ".env" ]; then
    echo "📋 Setting up environment variables..."
    cp .env.example .env
    echo "✅ Created .env from .env.example"
    echo "   Please update .env with your actual configuration values:"
    echo "   - NEON_DATABASE_URL"
    echo "   - OPENAI_API_KEY"
    echo "   - FARCASTER_* keys"
    echo "   - STACKS_PRIVATE_KEY"
fi

# Check if Clarinet is installed
if ! command -v clarinet &> /dev/null; then
    echo "📦 Installing Clarinet (Stacks development framework)..."
    curl -L https://github.com/hirosystems/clarinet/releases/latest/download/clarinet-linux-x64.tar.gz | tar xz
    sudo mv clarinet /usr/local/bin/
    echo "✅ Clarinet installed"
else
    echo "✅ Clarinet already installed"
fi

# Check if Clarinet.toml exists, if not initialize Clarinet project
if [ ! -f "Clarinet.toml" ]; then
    echo "⚙️  Initializing Clarinet project..."
    clarinet new echoecho-protocol --no-git
    echo "✅ Clarinet project initialized"
fi

# Install Clarinet dependencies
echo "📦 Installing Clarinet dependencies..."
clarinet install

# Run tests to verify setup
echo "🧪 Running tests to verify setup..."
npm run test

if [ $? -eq 0 ]; then
    echo "✅ Tests passed successfully"
else
    echo "⚠️  Some tests failed, but setup is complete"
fi

echo "🎉 Setup complete!"
echo ""
echo "Available commands:"
echo "  make help              - Show all available commands"
echo "  make dev               - Start Next.js development server"
echo "  make build             - Build for production"
echo "  make test              - Run tests"
echo "  make clarinet-console  - Start Clarinet console"
echo "  make clarinet-test     - Run Clarinet contract tests"
echo "  make docker-compose-up - Start all services"
echo ""
echo "Stacks Development:"
echo "  make clarinet          - Install Clarinet"
echo "  make clarinet-deploy   - Deploy contracts locally"
echo "  make deploy-testnet    - Deploy to Stacks testnet"
echo "  make deploy-mainnet    - Deploy to Stacks mainnet"
echo ""
echo "Next steps:"
echo "1. Update .env with your API keys and database URL"
echo "2. Run 'make clarinet-console' to interact with contracts"
echo "3. Run 'make dev' to start the Next.js server"
echo "4. Run 'make test' to run the full test suite"
echo ""
echo "For Farcaster MiniApp development:"
echo "- The app is configured for Farcaster integration"
echo "- Use Neynar SDK for Farcaster API interactions"
echo "- OpenAI integration is ready for AI features"
echo ""
echo "For Stacks blockchain:"
echo "- Contracts are written in Clarity (.clar files)"
echo "- Use Clarinet for local development and testing"
echo "- Deploy to testnet/mainnet using the make commands"