# GoHighLevel MCP Server

Model Context Protocol server for GoHighLevel CRM API integration.

## Overview

This MCP server enables AI assistants (Claude Code, Claude Desktop) to interact with GoHighLevel CRM through a dual OAuth authentication system:
- **MCP Client Auth**: Bearer token (Claude Code) or GitHub OAuth (Claude Desktop)
- **GHL API Auth**: OAuth 2.0 with automatic token refresh

## Current Implementation

**Status**: ✅ Deployed and running on GCP VM (abound-infra-vm)
**URL**: https://ghl-mcp.aboundtechology.com
**Port**: 3006

### Available Tools (6)

Currently implements contact management only:
- `ghl_create_contact` - Create new contact
- `ghl_update_contact` - Update contact fields
- `ghl_search_contacts` - Search contacts by location
- `ghl_get_contact` - Get contact by ID
- `ghl_add_tag` - Add tag to contact
- `ghl_remove_tag` - Remove tag from contact

## Architecture

```
src/
├── index.ts                          # Entry point (HTTP mode)
├── mcp/
│   ├── http-server-json-rpc.ts      # HTTP server with dual auth
│   ├── server.ts                     # MCP server implementation
│   ├── ghl/
│   │   ├── oauth-manager.ts         # GHL OAuth 2.0 flow
│   │   └── client.ts                # GHL API client
│   └── tools/
│       └── contacts.ts              # Contact management tools
└── utils/
    ├── config.ts                    # Configuration
    └── logger.ts                    # Logging utility
```

## Deployment

The server is deployed as a systemd service on GCP VM:

```bash
# Service location
/opt/ai-agent-platform/mcp-servers/ghl-mcp

# Service file
/etc/systemd/system/ghl-mcp.service

# View logs
ssh abound-infra-vm
sudo journalctl -u ghl-mcp -f

# Restart service
sudo systemctl restart ghl-mcp
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run locally (requires .env with secrets)
node dist/index.js
```

## OAuth Scopes

The server uses these GHL OAuth scopes:
- `contacts.readonly` - Read contacts
- `contacts.write` - Create/update/delete contacts
- `conversations.readonly` - Read conversations
- `conversations.write` - Send messages
- `opportunities.readonly` - Read opportunities
- `opportunities.write` - Manage opportunities
- `calendars.readonly` - Read calendars
- `calendars.write` - Manage calendar events

## Configuration

Secrets are loaded from Google Secret Manager via `load-secrets.sh`:
- `GHL_CLIENT_ID` - GHL OAuth client ID
- `GHL_CLIENT_SECRET` - GHL OAuth client secret
- `GHL_MCP_AUTH_TOKEN` - Bearer token for Claude Code
- `GHL_MCP_GITHUB_CLIENT_ID` - GitHub OAuth for Claude Desktop
- `GHL_MCP_GITHUB_CLIENT_SECRET` - GitHub OAuth secret

## Next Steps

Additional tools to be implemented:
- Conversations (8 tools)
- Opportunities (7 tools)
- Calendars (9 tools)
- Workflows (2 tools)
- Forms (3 tools)
- Custom Objects (5 tools)

See [GHL_PRP.md](./GHL_PRP.md) for complete project documentation.
