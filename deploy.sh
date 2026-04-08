#!/bin/bash
# ══════════════════════════════════════════
# Taallam AI — Deploy Script
# Run this from inside /home/claude/taallam-ai
# ══════════════════════════════════════════

GITHUB_TOKEN="YOUR_GITHUB_TOKEN"
REPO_NAME="taallam-ai"

echo "🚀 Step 1: Get GitHub username..."
GITHUB_USER=$(curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user | grep '"login"' | cut -d'"' -f4)
echo "   User: $GITHUB_USER"

echo ""
echo "🚀 Step 2: Create GitHub repo..."
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  https://api.github.com/user/repos \
  -d "{\"name\":\"$REPO_NAME\",\"description\":\"Gamified AI Learning App — Ibrahim School\",\"private\":false}" \
  | grep '"html_url"' | head -1

echo ""
echo "🚀 Step 3: Push code to GitHub..."
git remote add origin "https://$GITHUB_TOKEN@github.com/$GITHUB_USER/$REPO_NAME.git" 2>/dev/null || \
git remote set-url origin "https://$GITHUB_TOKEN@github.com/$GITHUB_USER/$REPO_NAME.git"
git branch -M main
git push -u origin main

echo ""
echo "✅ Done! Now go to:"
echo "   https://vercel.com/new"
echo "   → Import: github.com/$GITHUB_USER/$REPO_NAME"
echo "   → Add env variables (see .env.local.example)"
echo "   → Deploy!"
