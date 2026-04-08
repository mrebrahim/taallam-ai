#!/bin/bash
# ════════════════════════════════════════════════
# Taallam AI — Full Setup Script
# Run this on YOUR machine (not in Claude's environment)
# Prerequisites: git, node, npm installed
# ════════════════════════════════════════════════

set -e  # Stop on any error

GITHUB_TOKEN="YOUR_GITHUB_TOKEN"
TEAM_ID="team_BXghnIGoVj2WI2IUtvPzLi6G"
REPO_NAME="taallam-ai"

echo "══════════════════════════════════════"
echo " Taallam AI — Deploy Setup"
echo "══════════════════════════════════════"

# ── Step 1: Get GitHub username ──
echo ""
echo "▶ Step 1: Getting GitHub username..."
GITHUB_USER=$(curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/user" | python3 -c "import sys,json; print(json.load(sys.stdin)['login'])" 2>/dev/null || \
  node -e "const r=require('child_process').execSync('curl -s -H \"Authorization: token '$GITHUB_TOKEN'\" https://api.github.com/user').toString(); console.log(JSON.parse(r).login)")
echo "  → Username: $GITHUB_USER"

# ── Step 2: Create GitHub repo ──
echo ""
echo "▶ Step 2: Creating GitHub repo..."
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" \
  "https://api.github.com/user/repos" \
  -d "{\"name\":\"$REPO_NAME\",\"description\":\"Gamified AI Learning App — Ibrahim School\",\"private\":false}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('  → Repo:', d.get('html_url', 'Already exists or: ' + str(d.get('errors',d.get('message','')))))" 2>/dev/null || echo "  → Repo might already exist, continuing..."

# ── Step 3: Push code ──
echo ""
echo "▶ Step 3: Pushing code to GitHub..."
git remote remove origin 2>/dev/null || true
git remote add origin "https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"
git branch -M main
git push -u origin main --force
echo "  → Code pushed successfully!"

# ── Step 4: Install Vercel CLI and create project ──
echo ""
echo "▶ Step 4: Setting up Vercel project..."
npm install -g vercel 2>/dev/null || true

# Create Vercel project via API
PROJECT_RESULT=$(curl -s -X POST \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.vercel.com/v9/projects?teamId=$TEAM_ID" \
  -d "{
    \"name\": \"taallam-ai\",
    \"framework\": \"nextjs\",
    \"gitRepository\": {
      \"type\": \"github\",
      \"repo\": \"${GITHUB_USER}/${REPO_NAME}\"
    }
  }")
echo "$PROJECT_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('  → Project:', d.get('name', d.get('error',{}).get('message','Check Vercel dashboard')))" 2>/dev/null || echo "  → Check your Vercel dashboard"

echo ""
echo "════════════════════════════════════════"
echo " ✅ Done! Next steps:"
echo "════════════════════════════════════════"
echo ""
echo "1. Go to: https://vercel.com/dashboard"
echo "   → Find 'taallam-ai' project"
echo "   → Settings → Environment Variables"
echo ""
echo "2. Add these env variables:"
echo "   NEXT_PUBLIC_SUPABASE_URL = https://raskcogecjfwuxvwldzp.supabase.co"
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo "   SUPABASE_SERVICE_ROLE_KEY = (from Supabase Dashboard → Settings → API)"
echo "   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_..."
echo "   STRIPE_SECRET_KEY = sk_live_..."
echo "   STRIPE_WEBHOOK_SECRET = whsec_..."
echo "   STRIPE_PRICE_PRO_MONTHLY = price_..."
echo "   STRIPE_PRICE_ELITE_YEARLY = price_..."
echo "   OPENAI_API_KEY = sk-..."
echo "   CRON_SECRET = (any random string)"
echo "   NEXT_PUBLIC_APP_URL = https://taallam-ai.vercel.app"
echo ""
echo "3. Trigger a new deploy from Vercel dashboard"
echo ""
echo "4. Enable Google OAuth in Supabase:"
echo "   https://supabase.com/dashboard/project/raskcogecjfwuxvwldzp/auth/providers"
echo "   → Google: ON → Add redirect URL:"
echo "   https://taallam-ai.vercel.app/api/auth/callback"
echo ""
