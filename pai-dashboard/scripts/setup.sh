#!/bin/bash

# PAI Business Dashboard - Setup Script
# This script sets up the development environment

set -e

echo "🚀 Setting up PAI Business Dashboard..."

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install it first:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo "✅ Bun is installed"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📋 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your configuration values"
fi

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Type check
echo "🔍 Running type check..."
bun run type-check

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env file with your configuration"
echo "2. Run 'bun dev' to start the development server"
echo "3. Open http://localhost:3000 in your browser"
echo ""
