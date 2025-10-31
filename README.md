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

The server uses these GHL OAuth scopes (configured in GHL Marketplace app):

**Core CRM:**
- `businesses.readonly` / `businesses.write` - Business data management
- `companies.readonly` - Company information
- `contacts.readonly` / `contacts.write` - Contacts management
- `conversations.readonly` / `conversations.write` - Conversations
- `conversations/message.readonly` / `conversations/message.write` - Direct messaging
- `conversations/reports.readonly` - Conversation analytics
- `conversations/livechat.write` - Live chat management
- `opportunities.readonly` / `opportunities.write` - Sales pipeline

**AI & Automation:**
- `conversation-ai.readonly` / `conversation-ai.write` - Conversation AI
- `knowledge-bases.readonly` / `knowledge-bases.write` - Knowledge bases
- `voice-ai-agent-goals.readonly` / `voice-ai-agent-goals.write` - Voice AI goals
- `voice-ai-agents.readonly` / `voice-ai-agents.write` - Voice AI agents
- `voice-ai-dashboard.readonly` - Voice AI dashboard
- `agent-studio.readonly` / `agent-studio.write` - Agent studio

**Calendar & Events:**
- `calendars.readonly` / `calendars.write` - Calendar management
- `calendars/events.readonly` / `calendars/events.write` - Event management
- `calendars/groups.readonly` / `calendars/groups.write` - Calendar groups
- `calendars/resources.readonly` / `calendars/resources.write` - Calendar resources

**Location Management:**
- `locations.readonly` - Location information
- `locations/customFields.readonly` / `locations/customFields.write` - Custom fields
- `locations/customValues.readonly` / `locations/customValues.write` - Custom values
- `locations/tags.readonly` / `locations/tags.write` - Tags
- `locations/tasks.readonly` / `locations/tasks.write` - Tasks
- `locations/templates.readonly` - Location templates
- `recurring-tasks.readonly` / `recurring-tasks.write` - Recurring tasks

**Content & Media:**
- `workflows.readonly` - Workflows
- `forms.readonly` / `forms.write` - Forms
- `medias.readonly` / `medias.write` - Media files
- `links.readonly` / `links.write` - Link management

**Custom Objects & Associations:**
- `objects/schema.readonly` / `objects/schema.write` - Object schemas
- `objects/record.readonly` / `objects/record.write` - Object records
- `associations.readonly` / `associations.write` - Associations
- `associations/relation.readonly` / `associations/relation.write` - Association relations

**Documents & Contracts:**
- `documents_contracts_template/list.readonly` - Contract templates list
- `documents_contracts_template/sendLink.write` - Send template links
- `documents_contracts/list.readonly` - Contracts list
- `documents_contracts/sendLink.write` - Send contract links

**Communications:**
- `twilioaccount.read` - Twilio account access
- `numberpools.read` - Number pools
- `phonenumbers.read` - Phone numbers
- `lc-email.readonly` - LC email access

**Marketing & Content:**
- `campaigns.readonly` - Marketing campaigns
- `blogs/list.readonly` - Blog posts list
- `blogs/posts.readonly` - Blog posts
- `blogs/author.readonly` - Blog authors
- `blogs/category.readonly` - Blog categories
- `blogs/post-update.write` / `blogs/post.write` - Blog post management
- `blogs/check-slug.readonly` - Check blog slugs
- `custom-menu-link.readonly` / `custom-menu-link.write` - Custom menu links
- `emails/schedule.readonly` - Email scheduling
- `emails/builder.readonly` / `emails/builder.write` - Email builder

**Social Media:**
- `socialplanner/tag.readonly` / `socialplanner/tag.write` - Social tags
- `socialplanner/category.readonly` / `socialplanner/category.write` - Social categories
- `socialplanner/statistics.readonly` - Social statistics
- `socialplanner/csv.readonly` / `socialplanner/csv.write` - Social CSV
- `socialplanner/account.readonly` / `socialplanner/account.write` - Social accounts
- `socialplanner/post.readonly` / `socialplanner/post.write` - Social posts
- `socialplanner/oauth.readonly` / `socialplanner/oauth.write` - Social OAuth
- `wordpress.site.readonly` - WordPress sites

**Funnels & Websites:**
- `funnels/redirect.readonly` / `funnels/redirect.write` - Funnel redirects
- `funnels/pagecount.readonly` - Page view counts
- `funnels/funnel.readonly` - Funnel data
- `funnels/page.readonly` - Funnel pages

**E-commerce & Products:**
- `store/setting.readonly` / `store/setting.write` - Store settings
- `store/shipping.readonly` / `store/shipping.write` - Shipping settings
- `products.readonly` / `products.write` - Products
- `products/prices.readonly` / `products/prices.write` - Product pricing
- `products/collection.readonly` / `products/collection.write` - Product collections

**Payments & Billing:**
- `invoices.readonly` / `invoices.write` - Invoices
- `invoices/estimate.readonly` / `invoices/estimate.write` - Estimates
- `invoices/template.readonly` / `invoices/template.write` - Invoice templates
- `invoices/schedule.readonly` / `invoices/schedule.write` - Invoice scheduling
- `payments/orders.readonly` / `payments/orders.write` - Orders
- `payments/orders.collectPayment` - Collect payments
- `payments/integration.readonly` / `payments/integration.write` - Payment integrations
- `payments/transactions.readonly` - Transaction history
- `payments/subscriptions.readonly` - Subscriptions
- `payments/coupons.readonly` / `payments/coupons.write` - Coupons
- `payments/custom-provider.readonly` / `payments/custom-provider.write` - Custom payment providers
- `charges.readonly` / `charges.write` - Charge management

**SaaS & Enterprise:**
- `saas/company.read` / `saas/company.write` - SaaS company management
- `saas/location.read` / `saas/location.write` - SaaS location management
- `snapshots.readonly` / `snapshots.write` - Snapshots
- `courses.readonly` / `courses.write` - Courses

**System & Admin:**
- `users.readonly` - User information
- `oauth.readonly` / `oauth.write` - OAuth management
- `surveys.readonly` - Surveys
- `marketplace-installer-details.readonly` - Marketplace installer details

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
