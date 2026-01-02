# Temporary Git Configuration Guide

This guide shows you how to set git user credentials **only for this repository** without affecting your global git config.

## Method 1: Set Local Git Config (Recommended)

Run these commands in your terminal **inside this project directory**:

```bash
cd /Users/karishmarajput/Documents/test/test_project

# Set user name (only for this repo)
git config user.name "Your Name"

# Set user email (only for this repo)
git config user.email "your.email@example.com"

# Verify it's set (should show your new values)
git config user.name
git config user.email
```

**Note**: These settings only apply to this repository and won't affect your global git config.

## Method 2: Set for Single Commit

If you only want to change it for one commit:

```bash
git commit --author="Your Name <your.email@example.com>" -m "Your commit message"
```

## Method 3: Use Different Remote URL with Credentials

If you want to push to a different GitHub account:

```bash
# Add remote with your username in the URL
git remote add origin https://YOUR_USERNAME@github.com/YOUR_USERNAME/YOUR_REPO.git

# Or if remote already exists, change it
git remote set-url origin https://YOUR_USERNAME@github.com/YOUR_USERNAME/YOUR_REPO.git
```

When you push, GitHub will prompt for a password or Personal Access Token.

## Method 4: Use SSH with Different Key

If you have SSH keys set up for different accounts:

```bash
# Use SSH URL instead
git remote set-url origin git@github.com:YOUR_USERNAME/YOUR_REPO.git

# Or use SSH config to specify which key to use
```

## Verify Your Settings

```bash
# Check local config (this repo only)
git config --local --list

# Check global config (all repos)
git config --global --list
```

## Remove Temporary Config

After you're done, you can remove the local config:

```bash
git config --local --unset user.name
git config --local --unset user.email
```

## Quick Example

```bash
# Navigate to project
cd /Users/karishmarajput/Documents/test/test_project

# Set temporary credentials
git config user.name "Deployment Account"
git config user.email "deploy@example.com"

# Initialize and push (if not already done)
git init
git add .
git commit -m "Initial commit for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main

# After deployment, you can remove the local config
git config --local --unset user.name
git config --local --unset user.email
```

---

**Important**: 
- Local config (`git config` without `--global`) only affects this repository
- Your global git config remains unchanged
- These settings are stored in `.git/config` file in this repository

