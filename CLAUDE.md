# CLAUDE.md

This file provides guidance to Claude Code when working with the ghl-mcp project.

## Project Overview

ghl-mcp is a Model Context Protocol (MCP) server that enables AI assistants (Claude Code, Claude Desktop) to interact with GoHighLevel CRM through OAuth 2.0 authentication.

**Status**: ✅ Deployed and operational on GCP VM
**URL**: https://ghl-mcp.aboundtechology.com
**Port**: 3006
**Deployment**: GCP VM (abound-infra-vm) at `/opt/ai-agent-platform/mcp-servers/ghl-mcp`

### Key Capabilities
- 44 MCP tools for GoHighLevel CRM operations
- Dual OAuth: MCP client auth (Bearer token / GitHub OAuth) + GHL API OAuth
- Tools: Contacts, Opportunities, Conversations, Calendars, Workflows, Forms, Custom Objects, Media, Locations, Users, Tags

---

## Architecture

```
src/
├── index.ts                          # Entry point (HTTP mode)
├── mcp/
│   ├── http-server-json-rpc.ts      # HTTP server with dual auth
│   ├── server.ts                     # MCP server implementation
│   ├── ghl/
│   │   ├── oauth-manager.ts         # GHL OAuth 2.0 flow (⚠️ memory-only)
│   │   └── client.ts                # GHL API client
│   ├── oauth/
│   │   ├── oauth-storage.ts         # SQLite storage for MCP OAuth
│   │   ├── github-oauth-provider.ts # GitHub OAuth provider
│   │   └── oauth-integration.ts     # OAuth integration layer
│   └── tools/
│       ├── contacts.ts              # Contact management (6 tools)
│       ├── opportunities.ts         # Opportunity management (5 tools)
│       ├── conversations.ts         # Messaging (4 tools)
│       ├── calendars.ts             # Calendar & appointments (6 tools)
│       ├── workflows.ts             # Workflows (2 tools, read-only)
│       ├── forms.ts                 # Forms (2 tools)
│       ├── custom-objects.ts        # Custom objects (5 tools)
│       ├── media.ts                 # Media files (3 tools)
│       ├── locations.ts             # Location management (5 tools)
│       ├── users.ts                 # User management (3 tools)
│       └── tags.ts                  # Tag management (3 tools)
└── utils/
    ├── config.ts                    # Configuration from env vars
    └── logger.ts                    # Logging utility
```

---

## Development Workflow

### Initial Setup

```bash
# Clone/navigate to project
cd /home/dreww/ghl-mcp

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### Making Changes

1. **Edit source files** in `src/`
2. **Always run build after changes**: `npm run build`
3. **Run type checking**: `npm run typecheck`

### **CRITICAL: Three-Location Sync Workflow**

**⚠️ ALWAYS keep all three locations in sync when making changes:**

1. **Local Repo** (`/home/dreww/ghl-mcp`) - Your working directory
2. **GCP VM** (`/opt/ai-agent-platform/mcp-servers/ghl-mcp`) - Production deployment
3. **GitHub Repo** (`ghl-mcp`) - Version control source of truth

#### Complete Change Workflow

**When you make ANY changes to the codebase, follow this exact order:**

```bash
# 1. LOCAL: Make changes and build
cd /home/dreww/ghl-mcp
# ... edit files ...
npm run typecheck
npm run build

# 2. GCP VM: Deploy to production
# Authenticate if needed
gcloud auth login --no-launch-browser

# Copy updated files
gcloud compute scp -r /home/dreww/ghl-mcp/dist/* \
  abound-infra-vm:/opt/ai-agent-platform/mcp-servers/ghl-mcp/dist/ \
  --zone=us-east1-c

# Copy source files if needed (for debugging/reference)
gcloud compute scp -r /home/dreww/ghl-mcp/src/* \
  abound-infra-vm:/opt/ai-agent-platform/mcp-servers/ghl-mcp/src/ \
  --zone=us-east1-c

# Restart service
gcloud compute ssh abound-infra-vm --zone=us-east1-c \
  --command="sudo systemctl restart ghl-mcp"

# Verify deployment
gcloud compute ssh abound-infra-vm --zone=us-east1-c \
  --command="sudo systemctl status ghl-mcp --no-pager"

# 3. GITHUB: Commit and push to version control
cd /home/dreww/ghl-mcp
git add .
git commit -m "Description of changes"
git push origin main

# Or use GitHub MCP tool (preferred):
# Use the appropriate GitHub MCP tool to:
# - Create commits
# - Push changes to ghl-mcp repository
# - Create pull requests if needed
```

#### GitHub MCP Tools

**Two GitHub MCP tools are available. Use the appropriate one for git operations:**

- Check which GitHub MCP tools are available in your MCP server list
- Use GitHub MCP tool to interact with the `ghl-mcp` repository
- Prefer using MCP tools over manual git commands when possible

#### Sync Verification Checklist

After making changes, verify all three locations are in sync:

- [ ] Local repo has latest changes and builds successfully
- [ ] GCP VM has updated files and service is running
- [ ] GitHub repo has committed and pushed changes
- [ ] All three locations have matching file versions

#### Common Sync Scenarios

**Scenario 1: Bug Fix**
1. Fix bug in local repo
2. Build and test locally
3. Deploy to GCP VM
4. Test on production
5. Commit to GitHub

**Scenario 2: New Feature**
1. Develop feature in local repo
2. Build and test locally
3. Deploy to GCP VM
4. Verify feature works in production
5. Commit to GitHub with detailed message

**Scenario 3: Configuration Change**
1. Update config in local repo
2. Build
3. Deploy to GCP VM
4. Restart service
5. Verify configuration is loaded
6. Commit to GitHub

**Scenario 4: Emergency Hotfix**
1. Fix issue in local repo
2. Build immediately
3. Deploy to GCP VM ASAP
4. Verify fix in production
5. Commit to GitHub (don't forget this step!)

### Testing Locally

```bash
# Test locally (requires .env with secrets)
npm run dev

# Or just start the built server
npm start
```

---

## Deployment to GCP VM

### CRITICAL: GCloud Authentication

**IMPORTANT**: Always use this exact command for gcloud authentication. Other methods don't work in WSL:

```bash
gcloud auth login --no-launch-browser
```

This command will:
1. Display a URL to open in your browser
2. Ask you to paste the authorization code back into the terminal

### Deployment Process

After building locally, deploy to GCP VM:

```bash
# 1. Authenticate with gcloud (use command above if needed)
gcloud auth login --no-launch-browser

# 2. Copy updated files to VM
gcloud compute scp /home/dreww/ghl-mcp/dist/mcp/ghl/client.js \
  abound-infra-vm:/opt/ai-agent-platform/mcp-servers/ghl-mcp/dist/mcp/ghl/client.js \
  --zone=us-east1-c

# Or copy entire dist directory for major changes
gcloud compute scp -r /home/dreww/ghl-mcp/dist/* \
  abound-infra-vm:/opt/ai-agent-platform/mcp-servers/ghl-mcp/dist/ \
  --zone=us-east1-c

# 3. Restart the service
gcloud compute ssh abound-infra-vm --zone=us-east1-c \
  --command="sudo systemctl restart ghl-mcp"

# 4. Check service status
gcloud compute ssh abound-infra-vm --zone=us-east1-c \
  --command="sudo systemctl status ghl-mcp --no-pager"

# 5. View logs (optional)
gcloud compute ssh abound-infra-vm --zone=us-east1-c \
  --command="sudo journalctl -u ghl-mcp -f"
```

### SSH Config Note

The SSH config uses: `abound-infra-vm.us-east1-c.abound-infr`
GCloud commands use: `abound-infra-vm` with `--zone=us-east1-c`

---

## OAuth Authentication

### Two OAuth Systems

1. **MCP OAuth** (GitHub) - For Claude Desktop authentication
   - ✅ Persisted in SQLite: `/opt/ai-agent-platform/mcp-servers/ghl-mcp/data/oauth.db`
   - Survives server restarts

2. **GHL OAuth** (GoHighLevel API) - For GHL API access
   - ⚠️ **Stored in memory only** (line 29 in oauth-manager.ts)
   - **Lost on every server restart** (known issue)
   - Requires re-authentication after restart

### Re-authenticating GHL OAuth

After server restart, GHL OAuth tokens are lost. To re-authenticate:

1. **Open this authorization URL** (select location `rJeAoDRXSwQ0yl0FbD8T`):

```
https://marketplace.gohighlevel.com/oauth/chooselocation?client_id=68f5c1f1b6cf2864326742bd-mgywmub2&response_type=code&redirect_uri=https://ghl-mcp.aboundtechology.com/ghl/callback&scope=contacts.readonly%20contacts.write%20conversations.readonly%20conversations.write%20opportunities.readonly%20opportunities.write%20calendars.readonly%20calendars.write%20calendars/events.readonly%20calendars/events.write%20workflows.readonly%20forms.readonly%20locations.readonly%20locations/customFields.readonly%20locations/customFields.write%20locations/customValues.readonly%20locations/customValues.write%20locations/tags.readonly%20locations/tags.write%20medias.readonly%20medias.write%20objects/schema.readonly%20objects/schema.write%20objects/record.readonly%20objects/record.write%20users.readonly%20oauth.readonly
```

2. **Authorize the app** in GoHighLevel
3. **Server will automatically** exchange code for tokens at `/ghl/callback`

### OAuth Scopes

See [README.md](README.md) for complete list of configured OAuth scopes.

---

## Configuration

### Environment Variables (loaded via load-secrets.sh)

```bash
# GHL API OAuth
GHL_CLIENT_ID           # From ghl-mcp-client-id secret
GHL_CLIENT_SECRET       # From ghl-mcp-client-secret secret
GHL_REDIRECT_URI        # https://ghl-mcp.aboundtechology.com/ghl/callback

# MCP Bearer Token (Claude Code)
AUTH_TOKEN              # From ghl-mcp-auth-token secret

# MCP GitHub OAuth (Claude Desktop)
GITHUB_CLIENT_ID        # From ghl-mcp-github-client-id secret
GITHUB_CLIENT_SECRET    # From ghl-mcp-github-client-secret secret

# Server Config
PORT=3006
BASE_URL=https://ghl-mcp.aboundtechology.com
NODE_ENV=production
LOG_LEVEL=info
MCP_MODE=http
```

### Secrets in Google Secret Manager

All secrets stored in project: `abound-infr`
Accessed via: `gcloud secrets versions access latest --secret=SECRET_NAME --project=abound-infr`

---

## Common Commands

### Build & Type Checking
```bash
npm run build          # Build TypeScript (ALWAYS run after changes)
npm run typecheck      # Type check without building
```

### Running Locally
```bash
npm start              # Start HTTP server (requires secrets in .env)
npm run dev            # Build and start
npm run start:stdio    # Start in stdio mode (for Claude Desktop local testing)
```

### Deployment
```bash
# See "Deployment to GCP VM" section above
```

### Viewing Logs on VM
```bash
# Real-time logs
gcloud compute ssh abound-infra-vm --zone=us-east1-c \
  --command="sudo journalctl -u ghl-mcp -f"

# Last 50 lines
gcloud compute ssh abound-infra-vm --zone=us-east1-c \
  --command="sudo journalctl -u ghl-mcp -n 50 --no-pager"
```

### Service Management on VM
```bash
# Status
gcloud compute ssh abound-infra-vm --zone=us-east1-c \
  --command="sudo systemctl status ghl-mcp --no-pager"

# Restart
gcloud compute ssh abound-infra-vm --zone=us-east1-c \
  --command="sudo systemctl restart ghl-mcp"

# Stop
gcloud compute ssh abound-infra-vm --zone=us-east1-c \
  --command="sudo systemctl stop ghl-mcp"

# Start
gcloud compute ssh abound-infra-vm --zone=us-east1-c \
  --command="sudo systemctl start ghl-mcp"
```

---

## Troubleshooting

### "No tokens available. Please authenticate first."

**Cause**: GHL OAuth tokens lost after server restart (memory-only storage)

**Solution**: Re-authenticate using the GHL OAuth URL (see "Re-authenticating GHL OAuth" section above)

### gcloud authentication fails

**Solution**: Use the exact command:
```bash
gcloud auth login --no-launch-browser
```

### 404 or 401 errors on API calls

**Check**:
1. Are GHL OAuth tokens authenticated? (see error above)
2. Are OAuth scopes correct in GHL Marketplace app?
3. Is the API endpoint correct? (check client.ts)

### Service won't start

**Debug**:
```bash
# Check service logs
gcloud compute ssh abound-infra-vm --zone=us-east1-c \
  --command="sudo journalctl -u ghl-mcp -n 100 --no-pager"

# Check if port 3006 is in use
gcloud compute ssh abound-infra-vm --zone=us-east1-c \
  --command="sudo lsof -i :3006"
```

---

## Known Issues

### 1. GHL OAuth Token Persistence (CRITICAL)

**Issue**: GHL OAuth tokens are stored in memory only (`private tokens: GHLTokens | null = null` in oauth-manager.ts line 29)

**Impact**:
- Tokens lost on every server restart
- Requires manual re-authentication after each restart
- "No tokens available" error on all GHL API calls

**Workaround**: Re-authenticate after every restart (see OAuth section)

**TODO**: Implement persistent token storage in SQLite (similar to MCP OAuth storage)

### 2. Missing Type Definitions

Some TypeScript types may need refinement as API responses are validated.

---

## Important File Locations

### On Local Machine
- Project: `/home/dreww/ghl-mcp`
- Source: `/home/dreww/ghl-mcp/src`
- Build output: `/home/dreww/ghl-mcp/dist`
- SSH config: `/home/dreww/.ssh/config`

### On GCP VM
- Project: `/opt/ai-agent-platform/mcp-servers/ghl-mcp`
- Service file: `/etc/systemd/system/ghl-mcp.service`
- OAuth DB: `/opt/ai-agent-platform/mcp-servers/ghl-mcp/data/oauth.db`
- Logs: `journalctl -u ghl-mcp`

---

## Related Documentation

- [README.md](./README.md) - Quick reference and current status
- [GHL_PRP.md](./GHL_PRP.md) - Complete project requirements and deployment history
- [Official GHL API Docs](https://marketplace.gohighlevel.com/docs)

---

## Development Best Practices

1. **CRITICAL: Always sync all three locations** (Local → GCP VM → GitHub)
   - Never skip the GitHub commit/push step
   - Follow the complete workflow in "Three-Location Sync Workflow" section
   - All three repos must stay in sync at all times
2. **Always build before deployment**: `npm run build`
3. **Always run typecheck**: `npm run typecheck`
4. **Test locally first** (if possible with .env secrets)
5. **After deployment, reload MCP server** in Claude Desktop/Code
6. **Check service logs** after deployment to verify startup
7. **Re-authenticate GHL OAuth** after server restarts
8. **Use GitHub MCP tool** for git operations when available

---

## Git Workflow

### Current Branch
Main branch: `main`

### Before Committing
```bash
# Check status
git status

# Type check
npm run typecheck

# Build
npm run build
```

### Common Operations
```bash
# Stage changes
git add .

# Commit
git commit -m "Description of changes"

# Push
git push origin main
```

---

## Quick Reference

### Test Location ID
Use this location ID for testing: `rJeAoDRXSwQ0yl0FbD8T`

### GHL Client ID
`68f5c1f1b6cf2864326742bd-mgywmub2`

### Server Endpoints
- Health: https://ghl-mcp.aboundtechology.com/health
- MCP: https://ghl-mcp.aboundtechology.com/mcp
- GHL OAuth Callback: https://ghl-mcp.aboundtechology.com/ghl/callback
- MCP OAuth: https://ghl-mcp.aboundtechology.com/mcp/oauth/*

### Common File Edits
- API client logic: `src/mcp/ghl/client.ts`
- Tool definitions: `src/mcp/tools/*.ts`
- OAuth management: `src/mcp/ghl/oauth-manager.ts`
- HTTP server: `src/mcp/http-server-json-rpc.ts`
- MCP server: `src/mcp/server.ts`
