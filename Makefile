# EchoEcho Protocol - Development Makefile

.PHONY: help dev build test clean install setup clarinet clarinet-check clarinet-test clarinet-console deploy deploy-testnet deploy-mainnet docker-build docker-run

# Default target
help: ## Show this help message
	@echo "EchoEcho Protocol - Development Commands"
	@echo ""
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

# Next.js Frontend
dev: ## Start Next.js development server
	@echo "🚀 Starting Next.js development server..."
	npm run dev

build: ## Build Next.js application
	@echo "🔨 Building Next.js application..."
	npm run build

start: ## Start Next.js production server
	@echo "🌐 Starting Next.js production server..."
	npm run start

# Code Quality
lint: ## Run ESLint
	@echo "🔍 Running ESLint..."
	npm run lint

format: ## Run Prettier
	@echo "💅 Running Prettier..."
	npm run format

# Testing
test: ## Run tests
	@echo "🧪 Running tests..."
	npm run test

test-watch: ## Run tests in watch mode
	@echo "👀 Running tests in watch mode..."
	npm run test -- --watch

# Dependencies
install: ## Install dependencies
	@echo "📦 Installing dependencies..."
	npm install

deps-update: ## Update dependencies
	@echo "⬆️  Updating dependencies..."
	npm update

# Clarinet (Stacks Development Framework)
clarinet: ## Install Clarinet (if not installed)
	@echo "📦 Installing Clarinet..."
	@if ! command -v clarinet &> /dev/null; then \
		curl -L https://github.com/hirosystems/clarinet/releases/latest/download/clarinet-linux-x64.tar.gz | tar xz && sudo mv clarinet /usr/local/bin/; \
	else \
		echo "Clarinet already installed"; \
	fi

clarinet-check: ## Check Clarinet installation
	@echo "🔍 Checking Clarinet installation..."
	clarinet --version

clarinet-install: ## Install project dependencies with Clarinet
	@echo "📦 Installing Clarinet dependencies..."
	@if [ -f "Clarinet.toml" ]; then \
		clarinet install; \
	else \
		echo "Clarinet.toml not found. Run 'clarinet new' first."; \
	fi

clarinet-test: ## Run Clarinet tests
	@echo "🧪 Running Clarinet tests..."
	@if [ -f "Clarinet.toml" ]; then \
		clarinet test; \
	else \
		echo "Clarinet.toml not found. Run 'clarinet new' first."; \
	fi

clarinet-console: ## Start Clarinet console
	@echo "💻 Starting Clarinet console..."
	@if [ -f "Clarinet.toml" ]; then \
		clarinet console; \
	else \
		echo "Clarinet.toml not found. Run 'clarinet new' first."; \
	fi

clarinet-deploy: ## Deploy contracts locally with Clarinet
	@echo "🚀 Deploying contracts locally..."
	@if [ -f "Clarinet.toml" ]; then \
		clarinet deployments generate --devnet && clarinet devnet start; \
	else \
		echo "Clarinet.toml not found. Run 'clarinet new' first."; \
	fi

# Stacks Deployment
deploy-testnet: ## Deploy to Stacks testnet
	@echo "🧪 Deploying to Stacks testnet..."
	@if [ -f "Clarinet.toml" ]; then \
		clarinet deployments generate --testnet && clarinet deployments apply --testnet; \
	else \
		echo "Clarinet.toml not found."; \
	fi

deploy-mainnet: ## Deploy to Stacks mainnet
	@echo "🌐 Deploying to Stacks mainnet..."
	@if [ -f "Clarinet.toml" ]; then \
		clarinet deployments generate --mainnet && clarinet deployments apply --mainnet; \
	else \
		echo "Clarinet.toml not found."; \
	fi

# Environment
setup: ## Setup development environment
	@echo "🚀 Setting up development environment..."
	./setup.sh

env-check: ## Check environment setup
	@echo "🔍 Checking environment..."
	@node --version
	@npm --version
	@clarinet --version 2>/dev/null || echo "Clarinet not found"
	@echo "✅ Environment check complete"

# Docker
docker-build: ## Build Docker image
	@echo "🐳 Building Docker image..."
	docker build -t echoecho-protocol .

docker-run: ## Run Docker container
	@echo "🐳 Running Docker container..."
	docker run -p 3000:3000 echoecho-protocol

docker-compose-up: ## Start services with docker-compose
	@echo "🐳 Starting services with docker-compose..."
	docker-compose up -d

docker-compose-down: ## Stop services with docker-compose
	@echo "🛑 Stopping services with docker-compose..."
	docker-compose down

# Database (Neon)
db-setup: ## Setup Neon database connection
	@echo "🗄️  Setting up Neon database..."
	@echo "Make sure to set NEON_DATABASE_URL in your .env file"

# Farcaster
farcaster-setup: ## Setup Farcaster miniapp
	@echo "🎭 Setting up Farcaster miniapp..."
	@echo "Farcaster miniapp is already configured in the codebase"

# Cleanup
clean: ## Clean build artifacts
	@echo "🧹 Cleaning build artifacts..."
	rm -rf .next
	rm -rf node_modules/.cache
	rm -rf out
	rm -rf clarinet.tar.gz

clean-clarinet: ## Clean Clarinet artifacts
	@echo "🧹 Cleaning Clarinet artifacts..."
	rm -rf .clarinet
	rm -rf deployments

clean-all: ## Clean everything including node_modules
	@echo "🧹 Cleaning everything..."
	rm -rf .next
	rm -rf node_modules
	rm -rf out
	rm -rf .clarinet
	rm -rf deployments
	rm -rf clarinet.tar.gz

# Utility
type-check: ## Run TypeScript type checking
	@echo "🔍 Running TypeScript type checking..."
	npx tsc --noEmit

analyze-contract: ## Analyze Clarity contract
	@echo "🔍 Analyzing Clarity contract..."
	@if [ -f "contracts/echo-protocol.clar" ]; then \
		echo "Contract analysis:"; \
		wc -l contracts/echo-protocol.clar; \
		grep -c "define-" contracts/echo-protocol.clar; \
	else \
		echo "Contract file not found"; \
	fi

# Development Workflow
full-setup: ## Complete development setup
	@echo "🚀 Running full development setup..."
	make setup
	make clarinet
	make install
	make clarinet-install
	@echo "✅ Full setup complete!"
	@echo "Next steps:"
	@echo "1. Run 'make clarinet-console' to start Clarinet console"
	@echo "2. Run 'make dev' to start the Next.js server"
	@echo "3. Run 'make test' to run the test suite"