#!/bin/bash

# Script to push refactored calculator to GitHub
# Run this script from your local machine after downloading the files

set -e

echo "🚀 Pushing Refactored Calculator to GitHub..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository. Please run from your selly.pl repository folder."
    exit 1
fi

# Check if origin remote exists
if ! git remote get-url origin >/dev/null 2>&1; then
    echo "📡 Adding GitHub remote..."
    git remote add origin https://github.com/DeathClaw665/selly.pl.git
fi

# Create and checkout new branch for the refactor
BRANCH_NAME="blackboxai-refactor-$(date +%s)"
echo "🌿 Creating branch: $BRANCH_NAME"
git checkout -b "$BRANCH_NAME"

# Add all files
echo "📁 Adding files..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "feat: refactor calculator to modular architecture with Selly.pl API integration

- Split monolithic HTML into separate CSS/JS files
- Added real Selly.pl REST API integration with fallback demo data  
- Enhanced product picker with search, caching, and stock status
- Improved UI with modern styling and responsive design
- Added comprehensive error handling and accessibility features
- Maintained all existing calculation functionality
- Added proper documentation and setup instructions

Files added:
- public/index.html - Clean HTML structure
- public/styles/main.css - Organized CSS styles
- public/scripts/selly-api.js - API integration
- public/scripts/product-picker.js - Enhanced search component  
- public/scripts/calculator.js - Core calculation logic
- public/scripts/app.js - Main application logic
- public/README.md - Documentation

Features:
✅ Real Selly.pl API integration
✅ Product search with autocomplete
✅ Stock status indicators
✅ Intelligent caching and error handling
✅ Responsive design and accessibility
✅ All original calculator features preserved"

# Push to GitHub
echo "⬆️ Pushing to GitHub..."
git push -u origin "$BRANCH_NAME"

echo "✅ Successfully pushed to GitHub!"
echo "🔗 Branch: $BRANCH_NAME"
echo "📋 You can now create a pull request on GitHub to merge the changes."

# Show the branch info
echo ""
echo "📊 Branch Information:"
echo "Repository: https://github.com/DeathClaw665/selly.pl.git"
echo "Branch: $BRANCH_NAME"
echo "Files: $(git ls-files | wc -l) files committed"
echo ""
echo "🌐 Live Demo: https://sb-1v4jehinsad7.vercel.run"