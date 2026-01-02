#!/bin/bash

# Script for one-time push with different GitHub account
# This only affects THIS repository, not your global git settings

cd /Users/karishmarajput/Documents/test/test_project

echo "Setting up temporary git config for this repository only..."
echo ""

# Set local git config (only this repo)
git config user.name "karishmarajput"
git config user.email "karrajput3948@gmail.com"

# Clear cached credentials
printf "host=github.com\nprotocol=https\npath=karishmarajput/casino.git\n\n" | git credential reject 2>/dev/null

echo "✓ Local git config set (only for this repo)"
echo "✓ Cached credentials cleared"
echo ""
echo "=========================================="
echo "IMPORTANT: You need a Personal Access Token"
echo "=========================================="
echo ""
echo "1. Go to: https://github.com/settings/tokens"
echo "2. Click 'Generate new token' → 'Generate new token (classic)'"
echo "3. Name: 'Deployment Token'"
echo "4. Select scope: Check 'repo' (Full control)"
echo "5. Click 'Generate token'"
echo "6. COPY THE TOKEN (you'll only see it once!)"
echo ""
read -p "Enter your Personal Access Token: " TOKEN

if [ -z "$TOKEN" ]; then
    echo "Error: No token provided. Exiting."
    exit 1
fi

# Remove any whitespace from token
TOKEN=$(echo "$TOKEN" | tr -d '[:space:]')

# Test token first
echo ""
echo "Testing token..."
USER_INFO=$(curl -s -H "Authorization: token ${TOKEN}" https://api.github.com/user)
if echo "$USER_INFO" | grep -q '"login"'; then
    USERNAME=$(echo "$USER_INFO" | grep '"login"' | head -1 | cut -d'"' -f4)
    echo "✓ Token is valid for user: $USERNAME"
    if [ "$USERNAME" != "karishmarajput" ]; then
        echo "⚠️  WARNING: Token is for account '$USERNAME', not 'karishmarajput'"
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Exiting. Please create a token for the correct account."
            exit 1
        fi
    fi
else
    echo "✗ Token is invalid or has no permissions"
    echo "Response: $USER_INFO"
    echo ""
    echo "Please check:"
    echo "1. Token was created for 'karishmarajput' account"
    echo "2. Token has 'repo' scope enabled"
    echo "3. Token hasn't expired"
    exit 1
fi

# Update remote URL with token embedded (temporary)
git remote set-url origin https://karishmarajput:${TOKEN}@github.com/karishmarajput/casino.git

echo ""
echo "Pushing to GitHub..."
git push -u origin main

# Check if push was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Push successful!"
    echo ""
    echo "Removing token from URL (for security)..."
    # Remove token from URL, keep just username
    git remote set-url origin https://karishmarajput@github.com/karishmarajput/casino.git
    echo "✓ Token removed from URL"
    echo ""
    echo "Your token has been saved in Keychain for this repository."
    echo "Your global git settings remain unchanged."
else
    echo ""
    echo "Push failed. Removing token from URL..."
    git remote set-url origin https://karishmarajput@github.com/karishmarajput/casino.git
    echo "Please check your token and try again."
fi

