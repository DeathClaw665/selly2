#!/bin/bash

# Automated GitHub Push Script
# Replace YOUR_GITHUB_TOKEN with your actual GitHub Personal Access Token

echo "🔄 Attempting to push to GitHub..."

# Set the repository URL with token authentication
# You'll need to replace YOUR_GITHUB_TOKEN with your actual token
GITHUB_TOKEN="YOUR_GITHUB_TOKEN"
REPO_URL="https://${GITHUB_TOKEN}@github.com/DeathClaw665/selly.pl.git"

# Check if token is set
if [ "$GITHUB_TOKEN" = "YOUR_GITHUB_TOKEN" ]; then
    echo "❌ Please edit this script and replace YOUR_GITHUB_TOKEN with your actual GitHub Personal Access Token"
    echo ""
    echo "To get a GitHub token:"
    echo "1. Go to https://github.com/settings/tokens"
    echo "2. Click 'Generate new token (classic)'"
    echo "3. Select 'repo' scope"
    echo "4. Copy the token and replace YOUR_GITHUB_TOKEN in this script"
    exit 1
fi

# Update remote URL
git remote set-url origin "$REPO_URL"

# Create branch name
BRANCH_NAME="blackboxai-refactor-selly-integration"

# Check if branch exists, if not create it
if ! git show-ref --verify --quiet refs/heads/"$BRANCH_NAME"; then
    echo "🌿 Creating new branch: $BRANCH_NAME"
    git checkout -b "$BRANCH_NAME"
else
    echo "🔄 Switching to existing branch: $BRANCH_NAME"
    git checkout "$BRANCH_NAME"
fi

# Push to GitHub
echo "⬆️ Pushing to GitHub..."
git push -u origin "$BRANCH_NAME"

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed to GitHub!"
    echo ""
    echo "📋 Summary:"
    echo "Repository: https://github.com/DeathClaw665/selly.pl"
    echo "Branch: $BRANCH_NAME" 
    echo "Live Demo: https://sb-1v4jehinsad7.vercel.run"
    echo ""
    echo "🔗 Create Pull Request:"
    echo "https://github.com/DeathClaw665/selly.pl/compare/main...$BRANCH_NAME"
else
    echo "❌ Push failed. Please check your GitHub token and repository access."
fi