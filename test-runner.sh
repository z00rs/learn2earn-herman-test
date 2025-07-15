#!/bin/bash

# Test runner script for Learn2Earn contract
echo "🧪 Learn2Earn Contract Test Suite"
echo "=================================="

# Check if forge is installed
if ! command -v forge &> /dev/null; then
    echo "❌ Foundry not found. Please install Foundry first:"
    echo "   curl -L https://foundry.paradigm.xyz | bash"
    echo "   foundryup"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
forge install foundry-rs/forge-std

# Run tests
echo ""
echo "🏃 Running tests..."
echo ""

# Run all tests with verbose output
forge test -vvv

# Check if tests passed
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All tests passed!"
    echo ""
    echo "📊 Test coverage:"
    forge coverage --report summary
else
    echo ""
    echo "❌ Some tests failed!"
    exit 1
fi

echo ""
echo "🎯 Test Summary:"
echo "- Student registration with payment validation"
echo "- Proof submission and validation"
echo "- Grading system with reward distribution"
echo "- Certificate issuance workflow"
echo "- VeBetterDAO integration testing"
echo "- Access control validation"
echo "- Edge cases and error handling"
echo ""
echo "✨ Contract is ready for deployment!"