#!/bin/bash
set -e

PROJECT_ID="abound-infr"

# GHL API OAuth credentials
export GHL_CLIENT_ID=$(gcloud secrets versions access latest --secret="ghl-mcp-client-id" --project="$PROJECT_ID")
export GHL_CLIENT_SECRET=$(gcloud secrets versions access latest --secret="ghl-mcp-client-secret" --project="$PROJECT_ID")

# MCP Bearer token (Claude Code)
export AUTH_TOKEN=$(gcloud secrets versions access latest --secret="ghl-mcp-auth-token" --project="$PROJECT_ID")

# MCP GitHub OAuth (Claude Desktop)
export GITHUB_CLIENT_ID=$(gcloud secrets versions access latest --secret="ghl-mcp-github-client-id" --project="$PROJECT_ID")
export GITHUB_CLIENT_SECRET=$(gcloud secrets versions access latest --secret="ghl-mcp-github-client-secret" --project="$PROJECT_ID")

# Server configuration
export PORT=3006
export BASE_URL="https://ghl-mcp.aboundtechology.com"
export GHL_REDIRECT_URI="https://ghl-mcp.aboundtechology.com/ghl/callback"
export NODE_ENV=production
export LOG_LEVEL=info
export MCP_MODE=http

exec node dist/index.js
