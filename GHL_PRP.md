# GoHighLevel MCP Server Deployment - Project Requirements & Plan

## Document Status
- **Created**: 2025-10-14
- **Last Updated**: 2025-10-21
- **Status**: ✅ **DEPLOYED AND OPERATIONAL**
- **Owner**: Drew W
- **Project**: ATO Infrastructure Setup
- **Phase**: Enhancement (Adding Additional Tools)

## Current Deployment Status (2025-10-21)

**✅ PHASE 1-5 COMPLETE: Server is deployed and operational**

- **URL**: https://ghl-mcp.aboundtechology.com
- **Port**: 3006
- **Location**: GCP VM (abound-infra-vm) at `/opt/ai-agent-platform/mcp-servers/ghl-mcp`
- **Service**: systemd service `ghl-mcp.service` (active and running)
- **Authentication**: ✅ Dual OAuth working (Bearer token + GitHub OAuth)
- **GHL API**: ✅ OAuth 2.0 with automatic token refresh (24h cycle)
- **Tools Implemented**: ✅ 44 total tools
  - 6 Contact management tools
  - 5 Opportunity management tools
  - 4 Conversation/messaging tools
  - 6 Calendar/appointment tools
  - 2 Workflow tools (read-only)
  - 2 Form tools (read-only)
  - 5 Custom Objects tools
  - 3 Media management tools
  - 5 Location management tools
  - 3 User management tools
  - 3 Tag management tools
- **Claude Code**: ✅ Connected and working
- **Claude Desktop**: ✅ Connected and working

**Next Phase**: Test and deploy updated tools to GCP VM

## Related Documents
- **[README.md](./README.md)** - Quick reference and current implementation status

---

## 1. Executive Summary

### Objective
Build and deploy a custom GHL MCP server to enable AI-powered automation of GoHighLevel CRM operations, starting with proper client intake for Abound Language Group (ALG) and Abound Research Services (ARS).

### Scope
- Build custom GHL MCP server following gws-mcp architecture pattern
- Implement dual OAuth authentication (MCP via GitHub + GHL API)
- Deploy to GCP VM (abound-infra-vm) as systemd service
- Integrate with existing MCP infrastructure (n8n-mcp, clickup-mcp, gws-mcp)
- Validate all required tools for client intake automation

### Key Deliverables
1. Custom TypeScript GHL MCP server following gws-mcp architecture
2. Dual OAuth implementation (GitHub for MCP + GHL API OAuth)
3. Systemd service deployment on GCP (port 3006, domain: ghl-mcp.aboundtechology.com)
4. Complete MCP tools for contacts, conversations, opportunities, calendars, workflows
5. Google Secret Manager integration for credential storage
6. Integration with Claude Code (bearer token) and Claude Desktop (OAuth)

### Success Metrics
- MCP server authenticated via both bearer token and GitHub OAuth
- GHL API OAuth token refresh works automatically (24-hour cycle)
- All MCP tools respond within 2 seconds
- Claude Code can access server globally without re-authentication per chat
- Client intake automation creates GHL contacts with proper tagging
- System handles 100+ API requests per day within rate limits

---

## 2. Background & Context

### Business Requirement
ATO needs a professional CRM system to manage client relationships starting with ALG and ARS. The client intake process must be automated to reduce manual work and ensure consistency across ClickUp, Notion, Google Workspace, and GoHighLevel.

### Technical Context
GoHighLevel API v2 provides comprehensive CRM capabilities through OAuth 2.0. Based on analysis of existing MCP servers (n8n-mcp, clickup-mcp, gws-mcp), the optimal implementation is a custom TypeScript server following the gws-mcp dual-OAuth architecture pattern.

### Research Findings Summary (Updated 2025-10-17)

**GHL API v2 Analysis:**
- **OAuth 2.0**: Authorization Code Grant flow
- **Token Expiration**: Access token = 24 hours, Refresh token = 1 year
- **Base URL**: `https://services.leadconnectorhq.com`
- **Token Endpoints**:
  - Access Token: `/oauth/token`
  - Location Token: `/oauth/locationToken` (for sub-account access)

**Available OAuth Scopes:**
- **Read-Only**: businesses, calendars, contacts, conversations, forms, invoices, locations, medias, opportunities, payments, products, users, workflows
- **Read-Write**: businesses, calendars, contacts, conversations, invoices, locations, medias, opportunities, payments, products, users
- **Specialized**: oauth, saas, socialplanner, voice-ai, associations, custom menu, documents/contracts

**API Categories (6 major):**
1. **CRM & Contacts**: Full CRUD + custom fields + tags
2. **Conversations**: SMS, Email, WhatsApp messaging
3. **Calendar & Events**: Appointment scheduling + booking workflows
4. **Opportunities**: Sales pipeline management
5. **Payments**: Invoice + payment processing
6. **Webhooks**: 50+ real-time event types

**Rate Limits:**
- **Burst**: 100 requests per 10 seconds
- **Daily**: 200,000 requests per day per Marketplace app
- **Sufficient for ATO**: Current usage ~100-500 requests/day

**Implementation Pattern (from existing servers):**
- **Best Match**: gws-mcp architecture (dual OAuth pattern)
- **Port**: 3006 (following sequence: n8n=3000, clickup=3003, gws=3005)
- **Domain**: ghl-mcp.aboundtechology.com
- **Systemd Service**: `/etc/systemd/system/ghl-mcp.service`
- **Secrets**: Google Secret Manager via `load-secrets.sh` script

### Dependencies
- **Upstream**: GHL Marketplace App (OAuth credentials in Google Secret Manager)
- **Downstream**: n8n workflows, ClickUp MCP, Notion MCP, GWS MCP
- **Infrastructure**: GCP VM (abound-infra-vm), systemd, nginx (for domain routing)
- **Development**: TypeScript, Node.js 18+, MCP SDK (@modelcontextprotocol/sdk)

---

## 3. Requirements

### 3.1 Functional Requirements

#### FR-1: Contact Management
- **Priority**: CRITICAL
- **Description**: Create, read, update, delete contact records in GHL
- **Acceptance Criteria**:
  - MCP tool `create_contact` creates contact with name, email, phone, tags
  - MCP tool `search_contacts` finds contacts by name, email, tag
  - MCP tool `update_contact` modifies contact fields and tags
  - MCP tool `delete_contact` removes contact records
  - Contact custom fields are accessible and modifiable

#### FR-2: Conversation Management
- **Priority**: HIGH
- **Description**: Send and receive messages (SMS, Email, WhatsApp)
- **Acceptance Criteria**:
  - MCP tool `send_message` sends SMS/Email to contact
  - MCP resource `conversations` lists message threads
  - Message history is accessible for each contact
  - Supports threaded conversations

#### FR-3: Opportunity Management
- **Priority**: MEDIUM
- **Description**: Track sales pipeline and deal stages
- **Acceptance Criteria**:
  - MCP tool `create_opportunity` creates deals with stages
  - MCP tool `update_opportunity` moves deals through pipeline
  - MCP resource `opportunities` lists all active deals
  - Opportunity values and probabilities are tracked

#### FR-4: Calendar Management
- **Priority**: MEDIUM
- **Description**: Manage appointments and booking workflows
- **Acceptance Criteria**:
  - MCP tool `create_appointment` schedules meetings
  - MCP resource `calendar_events` lists upcoming appointments
  - Booking confirmation emails sent automatically
  - Calendar sync with Google Calendar (if available)

#### FR-5: Webhook Integration
- **Priority**: CRITICAL
- **Description**: Trigger n8n workflows from GHL events
- **Acceptance Criteria**:
  - Webhook registered for "contact.created" event
  - Webhook registered for "contact.tag_added" event
  - Webhook payload includes all contact data
  - n8n receives webhook within 5 seconds of event

### 3.2 Non-Functional Requirements

#### NFR-1: Performance
- **Response Time**: MCP tool calls complete within 2 seconds
- **Throughput**: Handle 100+ API requests per day
- **Availability**: 99% uptime during business hours (8am-8pm EST)

#### NFR-2: Security
- **Authentication**: OAuth 2.0 with secure token storage
- **Token Refresh**: Automatic renewal every 24 hours
- **Secrets Management**: Environment variables, never committed to git
- **Data Privacy**: Contact data encrypted in transit (HTTPS)

#### NFR-3: Scalability
- **Multi-location Support**: Handle 3 sub-accounts (ALG, ARS, test)
- **Rate Limiting**: Respect GHL limits (100 req/10s, 200K req/day)
- **Concurrent Requests**: Support 5+ simultaneous operations

#### NFR-4: Maintainability
- **Logging**: Structured logs with request/response details
- **Monitoring**: Health check endpoint for uptime monitoring
- **Documentation**: API usage examples for all MCP tools
- **Error Handling**: Clear error messages with retry guidance

---

## 4. Architecture & Design

### 4.1 System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                     ATO Infrastructure (GCP VM)                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │         Claude Code / Claude Desktop (Client)               │  │
│  │  ┌──────────────┐               ┌──────────────┐           │  │
│  │  │ Bearer Token │               │ GitHub OAuth │           │  │
│  │  │  (Global)    │               │ (One-time)   │           │  │
│  │  └──────┬───────┘               └───────┬──────┘           │  │
│  └─────────┼─────────────────────────────┼──────────────────┘  │
│            │                             │                       │
│            ▼                             ▼                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ghl-mcp Server (Port 3006)                             │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │ HTTP Server (Express + JSON-RPC)                 │   │   │
│  │  │  - Bearer token auth (Claude Code)              │   │   │
│  │  │  - GitHub OAuth 2.1 (Claude Desktop)            │   │   │
│  │  │  - Session management (30min timeout)           │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │ GHL OAuth Manager                                │   │   │
│  │  │  - Authorization Code Grant                      │   │   │
│  │  │  - Auto token refresh (24h)                      │   │   │
│  │  │  - Multi-location support                        │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │ MCP Tools                                        │   │   │
│  │  │  - Contacts, Conversations, Opportunities        │   │   │
│  │  │  - Calendars, Workflows, Payments                │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └──────────────────┬──────────────────────────────────────┘   │
│                     │                                           │
│                     ▼                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │     GoHighLevel API v2 (services.leadconnectorhq.com)   │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │   │
│  │  │    ALG     │  │    ARS     │  │   Other    │        │   │
│  │  │  Location  │  │  Location  │  │ Locations  │        │   │
│  │  └────────────┘  └────────────┘  └────────────┘        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Parallel MCP Servers (Same VM)                         │   │
│  │  - n8n-mcp (port 3000)                                  │   │
│  │  - clickup-mcp (port 3003)                              │   │
│  │  - gws-mcp (port 3005)                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Component Details

#### GHL MCP Server
- **Language**: TypeScript (Node.js 18+)
- **Package Manager**: npm
- **Framework**: Express + MCP SDK (@modelcontextprotocol/sdk)
- **Protocol**: Model Context Protocol over HTTP (JSON-RPC)
- **Port**: 3006
- **Base URL**: https://ghl-mcp.aboundtechology.com
- **Authentication**:
  - MCP Client: Bearer token (Claude Code) + GitHub OAuth 2.1 (Claude Desktop)
  - GHL API: OAuth 2.0 Authorization Code Grant
- **Session Management**: 30-minute timeout with automatic cleanup
- **Health Check**: `/health` endpoint

#### MCP Tools - Contacts (6 tools)
```
ghl_create_contact         - Create new contact with custom fields and tags
ghl_update_contact         - Update contact fields, tags, and custom fields
ghl_search_contacts        - Search contacts by location and optional query
ghl_get_contact            - Get complete contact details by ID
ghl_add_tag                - Add tag to contact
ghl_remove_tag             - Remove tag from contact
```

#### MCP Tools - Opportunities (5 tools)
```
ghl_get_opportunity        - Get opportunity details by ID
ghl_list_opportunities     - List opportunities for a location (optional pipeline filter)
ghl_create_opportunity     - Create new opportunity in pipeline
ghl_update_opportunity     - Update opportunity stage, value, status, etc.
ghl_delete_opportunity     - Delete opportunity by ID
```

#### MCP Tools - Conversations (4 tools)
```
ghl_get_conversation       - Get conversation thread by ID
ghl_list_conversations     - List all conversations for a location
ghl_send_message           - Send message (SMS/Email/WhatsApp/GMB/IG/FB)
ghl_get_messages           - Get all messages in a conversation
```

#### MCP Tools - Calendars (6 tools)
```
ghl_list_calendars         - List all calendars for a location
ghl_get_calendar           - Get calendar details by ID
ghl_list_appointments      - List appointments with optional date range
ghl_create_appointment     - Schedule new calendar appointment
ghl_update_appointment     - Update appointment details
ghl_delete_appointment     - Delete/cancel appointment
```

#### MCP Tools - Workflows (2 tools - Read-Only)
```
ghl_list_workflows         - List all workflows for a location
ghl_get_workflow           - Get workflow details by ID
```

#### MCP Tools - Forms (2 tools - Read-Only)
```
ghl_list_forms             - List all forms for a location
ghl_get_form               - Get form details by ID
```

#### MCP Tools - Custom Objects (5 tools)
```
ghl_list_custom_objects    - List custom objects for a location with optional type filter
ghl_get_custom_object      - Get custom object details by ID
ghl_create_custom_object   - Create new custom object
ghl_update_custom_object   - Update custom object data
ghl_delete_custom_object   - Delete custom object
```

#### MCP Tools - Media (3 tools)
```
ghl_list_media             - List media files for a location
ghl_upload_media           - Upload media file (max 25MB, base64 encoded)
ghl_delete_media           - Delete media file
```

#### MCP Tools - Locations (5 tools)
```
ghl_get_location           - Get location details including settings
ghl_update_location        - Update location information (name, address, phone, etc.)
ghl_list_location_custom_fields    - List all custom fields defined for location
ghl_get_location_custom_values     - Get custom field values for location
ghl_update_location_custom_values  - Update custom field values for location
```

#### MCP Tools - Users (3 tools)
```
ghl_list_users             - List all users for a location
ghl_get_user               - Get user details by ID
ghl_update_user            - Update user information
```

#### MCP Tools - Tags (3 tools)
```
ghl_list_tags              - List all tags for a location
ghl_create_tag             - Create new tag with optional color
ghl_delete_tag             - Delete tag
```

**Total Tools: 44** (6 contacts + 5 opportunities + 4 conversations + 6 calendars + 2 workflows + 2 forms + 5 custom objects + 3 media + 5 locations + 3 users + 3 tags)

### 4.3 Data Flow

#### Contact Creation Flow
```
1. n8n Workflow Triggered
   ↓
2. n8n calls n8n-mcp tool "n8n_create_workflow"
   ↓
3. Workflow includes GHL webhook trigger node
   ↓
4. GHL webhook fires on "contact.created"
   ↓
5. n8n receives webhook payload
   ↓
6. n8n calls ClickUp-mcp tool "create_task"
   ↓
7. n8n calls Notion-mcp tool "create_page"
   ↓
8. n8n calls GWS-mcp tool "create_folder"
   ↓
9. n8n calls ghl-mcp tool "update_contact" (add tag "Processed")
   ↓
10. Complete - client record exists in all systems
```

### 4.4 Dual OAuth Architecture (ACTUAL IMPLEMENTATION)

**Note**: This section documents the actual working implementation deployed on GCP VM.

#### How the Dual OAuth Actually Works

The server implements **two independent OAuth flows**:

1. **MCP Client Authentication** - Authenticates the MCP client (Claude Code or Claude Desktop)
2. **GHL API Authentication** - Authenticates with GoHighLevel API

##### Key Implementation Details

**Bearer Token Authentication (Claude Code - GLOBAL ACCESS)**

The solution that finally made Claude Code work globally was implementing bearer token authentication that creates a persistent session:

```typescript
// From http-server-json-rpc.ts lines 174-198
if (authHeader.startsWith('Bearer ')) {
  const token = authHeader.substring(7);

  if (token === config.authToken) {
    // Create/get anonymous session - THIS IS THE KEY!
    let session = Array.from(this.sessions.values()).find(s => s.accessToken === token);
    if (!session) {
      session = {
        id: this.generateSessionId(),
        accessToken: token,
        lastActivity: Date.now(),
      };
      this.sessions.set(session.id, session);
    } else {
      session.lastActivity = Date.now(); // Keep session alive
    }

    (req as any).session = session;
    next();
    return;
  }
}
```

**Critical Insight**: The bearer token auth creates a **reusable session** that persists across chat threads. The session is kept alive as long as requests come in within the 30-minute timeout window. This eliminates the need to re-authenticate for every new chat in Claude Code.

**Session Management**

```typescript
// Session cleanup every minute
private startSessionCleanup(): void {
  setInterval(() => {
    const now = Date.now();
    const expired: string[] = [];

    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastActivity > config.sessionTimeout) {
        expired.push(id);
      }
    }

    for (const id of expired) {
      this.sessions.delete(id);
    }
  }, 60000);
}
```

**GHL OAuth Token Injection**

Each session can store GHL OAuth tokens. When a request comes in:

```typescript
// From http-server-json-rpc.ts lines 138-142
// Inject GHL tokens into MCP server if available
if (session.ghlTokens) {
  this.mcpServer.setOAuthTokens(session.ghlTokens);
}
```

**Automatic Token Refresh**

The GHL OAuth manager automatically refreshes tokens before expiry:

```typescript
// From ghl/oauth-manager.ts lines 132-144
async getAccessToken(): Promise<string> {
  if (!this.tokens) {
    throw new Error('No tokens available. Please authenticate first.');
  }

  // Refresh if token expires in less than 5 minutes
  const fiveMinutes = 5 * 60 * 1000;
  if (Date.now() >= this.tokens.expiresAt - fiveMinutes) {
    await this.refreshAccessToken();
  }

  return this.tokens!.accessToken;
}
```

#### MCP Client Authentication (Claude Desktop - GitHub OAuth)
```
Claude Desktop              ghl-mcp Server           GitHub
     │                            │                      │
     │ 1. Discover OAuth metadata │                      │
     ├───────────────────────────►│                      │
     │ /.well-known/oauth-authorization-server           │
     │                            │                      │
     │ 2. Dynamic Client Registration                    │
     ├───────────────────────────►│                      │
     │ POST /mcp/register         │                      │
     │                            │                      │
     │ 3. Authorization redirect  │                      │
     ├───────────────────────────►├─────────────────────►│
     │                            │                      │
     │ 4. GitHub auth callback    │                      │
     │◄───────────────────────────┤◄─────────────────────┤
     │ GET /mcp/oauth/callback    │                      │
     │                            │                      │
     │ 5. Token exchange          │                      │
     ├───────────────────────────►│                      │
     │ POST /mcp/token            │                      │
     │                            │                      │
     │ 6. Use OAuth token for MCP requests               │
     ├───────────────────────────►│                      │
     │ Authorization: Bearer <token>                     │
     │                            │                      │
```

#### GHL API Authentication (OAuth 2.0)
```
ghl-mcp Server              GHL Marketplace
     │                            │
     │ 1. /oauth/start endpoint   │
     │    → User visits in browser│
     ├───────────────────────────►│
     │                            │
     │ 2. User approves app       │
     │                            │
     │ 3. Callback with auth code │
     │◄───────────────────────────┤
     │ GET /oauth/callback?code=X │
     │                            │
     │ 4. Exchange code for tokens│
     ├───────────────────────────►│
     │ POST /oauth/token          │
     │                            │
     │ 5. Access + Refresh tokens │
     │◄───────────────────────────┤
     │ Stored in oauth.db         │
     │                            │
     │ 6. API calls with token    │
     ├───────────────────────────►│
     │ Authorization: Bearer <AT> │
     │                            │
     │ 7. Auto-refresh (24h cycle)│
     ├───────────────────────────►│
     │ POST /oauth/token          │
     │ grant_type=refresh_token   │
     │                            │
```

---

## 5. Implementation Plan

### Phase 0: GHL Marketplace Setup (Day 1)

#### Tasks
- [ ] Create GHL Marketplace App in developer portal (marketplace.gohighlevel.com)
- [ ] Configure app settings:
  - App name: "ATO Infrastructure MCP"
  - Redirect URI: `https://ghl-mcp.aboundtechology.com/oauth/callback`
  - Scopes: contacts.*, conversations.*, opportunities.*, calendars.*, workflows.readonly
- [ ] Obtain OAuth 2.0 credentials (Client ID + Client Secret)
- [ ] Store credentials in Google Secret Manager:
  ```bash
  gcloud secrets create ghl-mcp-client-id --data-file=- --project=abound-infr
  gcloud secrets create ghl-mcp-client-secret --data-file=- --project=abound-infr
  ```
- [ ] Generate MCP auth token and GitHub OAuth credentials
- [ ] Store in Secret Manager (ghl-mcp-auth-token, ghl-mcp-github-client-id, ghl-mcp-github-client-secret)

#### Acceptance Criteria
- Marketplace App created and approved
- All credentials stored in Google Secret Manager
- Redirect URI matches deployment URL

#### Estimated Time: 2-3 hours

---

### Phase 1: Server Development (Day 1-5)

#### Tasks
- [ ] Initialize TypeScript project
  ```bash
  mkdir -p /opt/ai-agent-platform/mcp-servers/ghl-mcp
  cd /opt/ai-agent-platform/mcp-servers/ghl-mcp
  npm init -y
  npm install typescript @types/node --save-dev
  npm install @modelcontextprotocol/sdk express zod dotenv
  npm install googleapis google-auth-library better-sqlite3
  npx tsc --init
  ```
- [ ] Copy gws-mcp architecture as base
  ```bash
  # Copy from gws-mcp on GCP VM:
  # - src/index.ts
  # - src/mcp/http-server-json-rpc.ts
  # - src/mcp/oauth/ (entire directory)
  # - src/utils/config.ts, logger.ts
  ```
- [ ] Implement GHL OAuth manager (src/mcp/ghl/oauth-manager.ts)
  - Authorization Code Grant flow
  - Token refresh logic (24h expiry)
  - Multi-location token management
  - Storage in SQLite (oauth.db)
- [ ] Implement GHL API client (src/mcp/ghl/client.ts)
  - Base HTTP client with auth headers
  - Error handling and rate limiting
  - Location context switching
- [ ] Implement MCP tools (Priority 1 - Contacts)
  - ghl_create_contact
  - ghl_update_contact
  - ghl_search_contacts
  - ghl_get_contact
  - ghl_add_tag
  - ghl_remove_tag
- [ ] Configure health check endpoint
- [ ] Build and test locally
  ```bash
  npm run build
  node dist/index.js
  ```

#### Acceptance Criteria
- TypeScript builds without errors
- Server starts and listens on port 3006
- Health check returns server status
- OAuth metadata endpoints respond correctly
- Contact tools validated with test GHL account

#### Estimated Time: 12-16 hours

---

### Phase 2: MCP Tool Validation (Day 3-4)

#### Tasks
- [ ] Test contact creation
  ```bash
  # Using MCP client or n8n
  ghl_create_contact({
    "locationId": "test_location_id",
    "firstName": "Test",
    "lastName": "Contact",
    "email": "test@example.com",
    "tags": ["test"]
  })
  ```
- [ ] Test contact search
  ```bash
  ghl_search_contacts({
    "locationId": "test_location_id",
    "query": "test@example.com"
  })
  ```
- [ ] Test contact update
  ```bash
  ghl_update_contact({
    "contactId": "contact_id_from_search",
    "tags": ["test", "validated"]
  })
  ```
- [ ] Test message sending (if SMS credits available)
  ```bash
  ghl_send_message({
    "contactId": "contact_id",
    "type": "Email",
    "subject": "Test Message",
    "body": "This is a test message from ghl-mcp"
  })
  ```
- [ ] Test opportunity creation
  ```bash
  ghl_create_opportunity({
    "locationId": "test_location_id",
    "contactId": "contact_id",
    "name": "Test Deal",
    "value": 5000,
    "stage": "Proposal"
  })
  ```
- [ ] Document all test results in `GHL_MCP_VALIDATION_RESULTS.md`

#### Acceptance Criteria
- All CRUD operations work correctly
- Error messages are clear and actionable
- Response times are under 2 seconds
- Data persists in GHL interface

#### Estimated Time: 3-4 hours

---

### Phase 3: Docker Containerization (Day 4-5)

#### Tasks
- [ ] Create Dockerfile
  ```dockerfile
  FROM python:3.12-slim
  WORKDIR /app
  COPY requirements.txt .
  RUN pip install --no-cache-dir -r requirements.txt
  COPY src/ ./src/
  ENV PYTHONUNBUFFERED=1
  EXPOSE 3006 3007
  CMD ["python", "src/server.py"]
  ```
- [ ] Create docker-compose.yml
  ```yaml
  version: '3.8'
  services:
    ghl-mcp:
      build: .
      container_name: ghl-mcp-server
      ports:
        - "3006:3006"
        - "3007:3007"
      environment:
        - GHL_CLIENT_ID=${GHL_CLIENT_ID}
        - GHL_CLIENT_SECRET=${GHL_CLIENT_SECRET}
        - GHL_ACCESS_TOKEN=${GHL_ACCESS_TOKEN}
        - GHL_REFRESH_TOKEN=${GHL_REFRESH_TOKEN}
      volumes:
        - ./data:/app/data
      restart: unless-stopped
  ```
- [ ] Build Docker image
  ```bash
  docker build -t ghl-mcp:latest .
  ```
- [ ] Run container
  ```bash
  docker-compose up -d
  ```
- [ ] Verify health check
  ```bash
  docker logs ghl-mcp-server
  curl http://localhost:3006/health
  ```

#### Acceptance Criteria
- Docker image builds successfully
- Container starts and runs without errors
- Health check passes
- MCP tools work identically to local deployment
- Token refresh works inside container

#### Estimated Time: 2-3 hours

---

### Phase 4: GCP Deployment (Day 5-6)

#### Tasks
- [ ] SSH into abound-infra-vm
  ```bash
  gcloud compute ssh abound-infra-vm --zone=us-central1-a
  ```
- [ ] Clone repository
  ```bash
  cd /opt/mcp-servers
  git clone https://github.com/basicmachines-co/open-ghl-mcp ghl-mcp
  cd ghl-mcp
  ```
- [ ] Copy OAuth tokens from local machine
  ```bash
  # On local machine
  scp .env abound-infra-vm:/opt/mcp-servers/ghl-mcp/.env
  ```
- [ ] Build and run container
  ```bash
  docker-compose up -d
  ```
- [ ] Configure firewall rules (if needed)
  ```bash
  gcloud compute firewall-rules create allow-ghl-mcp \
    --allow tcp:3006,tcp:3007 \
    --source-ranges 0.0.0.0/0 \
    --target-tags mcp-server
  ```
- [ ] Update n8n credentials with production URL
  ```
  http://abound-infra-vm:3006
  ```
- [ ] Test from n8n instance

#### Acceptance Criteria
- Container runs on GCP VM
- Health check accessible from n8n
- OAuth tokens persist across container restarts
- Firewall allows necessary traffic
- Logs are accessible via `docker logs`

#### Estimated Time: 2-3 hours

---

### Phase 5: n8n Integration (Day 6-7)

#### Tasks
- [ ] Create n8n workflow "GHL - Create Contact"
  - Trigger: Manual (for testing)
  - Node 1: HTTP Request to ghl-mcp `create_contact`
  - Node 2: Set tags on new contact
  - Node 3: Log contact ID
- [ ] Create n8n workflow "GHL - Webhook Test"
  - Trigger: Webhook (GHL contact.created)
  - Node 1: Parse webhook payload
  - Node 2: Log contact data
  - Node 3: Call ClickUp-mcp to create task
- [ ] Register webhook in GHL
  ```bash
  # Via GHL UI or API
  POST /webhooks
  {
    "url": "https://n8n.abound.tech/webhook/ghl-contact-created",
    "event": "contact.created"
  }
  ```
- [ ] Test end-to-end flow
  - Create contact in GHL manually
  - Verify webhook fires
  - Verify n8n workflow executes
  - Verify ClickUp task created
- [ ] Document workflow in `GHL_N8N_INTEGRATION.md`

#### Acceptance Criteria
- n8n can call ghl-mcp tools successfully
- Webhooks trigger n8n workflows reliably
- Error handling works (retries on failure)
- Logs show complete request/response data

#### Estimated Time: 3-4 hours

---

### Phase 6: Client Intake Automation (Day 7-10)

#### Tasks
- [ ] Create ALG contact record in GHL
  - Name: Abound Language Group
  - Email: info@aboundlanguage.com
  - Tags: ["Client", "Translation Services"]
  - Custom Field: Client Status = "Active"
- [ ] Create ARS contact record in GHL
  - Name: Abound Research Services
  - Email: info@aboundresearch.com
  - Tags: ["Client", "Research Services"]
  - Custom Field: Client Status = "Active"
- [ ] Build n8n workflow "New Client Intake"
  - Trigger: GHL webhook (contact with "Client" tag)
  - Node 1: Get contact details from GHL
  - Node 2: Create ClickUp project
  - Node 3: Create Notion page
  - Node 4: Create GDrive folder structure
  - Node 5: Update GHL contact (tag "Processed")
  - Node 6: Send Slack notification to team
- [ ] Test workflow with ALG and ARS
- [ ] Refine error handling and retries
- [ ] Document complete process in `NEW_CLIENT_INTAKE_PROCESS.md`

#### Acceptance Criteria
- ALG and ARS exist in GHL as proper client records
- Workflow creates all necessary resources
- All systems stay in sync (GHL, ClickUp, Notion, GDrive)
- Process completes in under 2 minutes
- Zero manual intervention required
- Team receives notification on completion

#### Estimated Time: 4-6 hours

---

## 6. Testing Strategy

### 6.1 Unit Tests
- Test OAuth token refresh logic
- Test API request/response parsing
- Test error handling for rate limits
- Test MCP tool parameter validation

### 6.2 Integration Tests
- Test complete contact CRUD cycle
- Test message sending across channels (SMS, Email)
- Test opportunity pipeline operations
- Test webhook delivery and processing
- Test multi-location support (ALG, ARS, test)

### 6.3 End-to-End Tests
- Create contact in GHL → Verify webhook → Verify n8n workflow → Verify ClickUp task
- Update contact tag → Verify sync across systems
- Delete contact → Verify cleanup in all systems

### 6.4 Performance Tests
- Measure API response times (target: <2s)
- Test rate limit handling (burst: 100 req/10s)
- Test concurrent requests (5+ simultaneous)
- Monitor token refresh reliability

### 6.5 Security Tests
- Verify OAuth tokens are never logged
- Test token encryption in storage
- Verify HTTPS for all API calls
- Test webhook signature validation (if supported)

---

## 7. Deployment Checklist

### Pre-Deployment
- [ ] GHL Marketplace App created
- [ ] OAuth credentials obtained and tested
- [ ] API access confirmed working on Starter plan
- [ ] open-ghl-mcp repository cloned
- [ ] Python environment configured
- [ ] Dependencies installed

### Local Deployment
- [ ] Server starts without errors
- [ ] Health check passes
- [ ] OAuth flow completed successfully
- [ ] All MCP tools validated
- [ ] Test contacts created and cleaned up

### Docker Deployment
- [ ] Dockerfile created and tested
- [ ] docker-compose.yml configured
- [ ] Environment variables set correctly
- [ ] Container builds successfully
- [ ] Container runs without errors
- [ ] Health check passes in container

### GCP Deployment
- [ ] VM access confirmed
- [ ] Repository cloned to /opt/mcp-servers
- [ ] OAuth tokens transferred securely
- [ ] Docker container running on VM
- [ ] Firewall rules configured
- [ ] Health check accessible from n8n
- [ ] Logs monitored for errors

### n8n Integration
- [ ] n8n can reach ghl-mcp server
- [ ] MCP tools callable from n8n workflows
- [ ] Webhooks registered in GHL
- [ ] Webhook URL accessible from internet
- [ ] Test workflows execute successfully

### Production Validation
- [ ] ALG contact record created
- [ ] ARS contact record created
- [ ] Client intake workflow tested
- [ ] All systems in sync
- [ ] Error handling verified
- [ ] Documentation complete

---

## 8. Monitoring & Maintenance

### Health Monitoring
- **Health Check Endpoint**: `http://abound-infra-vm:3006/health`
- **Monitoring Frequency**: Every 5 minutes
- **Alert Threshold**: 3 consecutive failures
- **Alert Destination**: Slack #infrastructure channel

### Log Monitoring
- **Log Location**: `docker logs ghl-mcp-server`
- **Log Rotation**: Daily, keep 7 days
- **Key Metrics**:
  - API request count per hour
  - Error rate percentage
  - Average response time
  - Token refresh success rate

### Token Management
- **Access Token Expiry**: 24 hours
- **Refresh Token Expiry**: 30 days (typical)
- **Auto-Refresh**: Enabled via open-ghl-mcp
- **Manual Refresh**: Required if auto-refresh fails
- **Backup Strategy**: Store refresh token in GCP Secret Manager

### Rate Limit Monitoring
- **Burst Limit**: 100 requests per 10 seconds
- **Daily Limit**: 200,000 requests per day
- **Current Usage**: Log every 1000 requests
- **Alert Threshold**: 80% of daily limit (160,000 requests)

### Maintenance Tasks
- **Weekly**: Review logs for errors
- **Monthly**: Update dependencies (uv pip install --upgrade)
- **Quarterly**: Review GHL API changelog for breaking changes
- **Annually**: Renew OAuth credentials if expired

---

## 9. Troubleshooting Guide

### Issue: MCP Server Won't Start
**Symptoms**: Container exits immediately after start
**Diagnosis**:
```bash
docker logs ghl-mcp-server
# Look for Python errors or missing dependencies
```
**Resolution**:
- Verify Python version (3.12+)
- Check requirements.txt dependencies installed
- Validate environment variables set correctly
- Ensure OAuth tokens are present and valid

### Issue: OAuth Token Expired
**Symptoms**: API requests return 401 Unauthorized
**Diagnosis**:
```bash
curl -H "Authorization: Bearer $GHL_ACCESS_TOKEN" \
  https://rest.gohighlevel.com/v1/contacts
# Returns: {"error": "Unauthorized"}
```
**Resolution**:
- Check token expiry timestamp
- Trigger manual token refresh
- Verify refresh token is valid
- Re-run OAuth flow if refresh fails

### Issue: Rate Limit Exceeded
**Symptoms**: API requests return 429 Too Many Requests
**Diagnosis**:
```bash
# Check response headers
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1234567890
```
**Resolution**:
- Wait until reset timestamp
- Implement exponential backoff in n8n workflows
- Review API call frequency
- Consider batching operations

### Issue: Webhook Not Firing
**Symptoms**: GHL contact created but n8n workflow not triggered
**Diagnosis**:
- Check webhook registration in GHL UI
- Verify webhook URL is publicly accessible
- Test webhook URL manually with curl
- Check n8n webhook node configuration
**Resolution**:
- Re-register webhook in GHL
- Verify firewall allows inbound traffic
- Check n8n webhook authentication
- Review n8n execution logs

### Issue: Contact Creation Fails
**Symptoms**: `ghl_create_contact` returns error
**Diagnosis**:
```bash
# Check MCP server logs
docker logs ghl-mcp-server | grep "create_contact"
```
**Resolution**:
- Verify locationId is correct
- Check required fields are provided (name, email)
- Validate email format
- Ensure custom fields match GHL schema

---

## 10. Documentation Requirements

### Technical Documentation
- [ ] `GHL_API_TEST_RESULTS.md` - API access validation results
- [ ] `GHL_MCP_VALIDATION_RESULTS.md` - MCP tool test results
- [ ] `GHL_MCP_DEPLOYMENT_GUIDE.md` - Step-by-step deployment instructions
- [ ] `GHL_N8N_INTEGRATION.md` - n8n workflow integration guide
- [ ] `GHL_TROUBLESHOOTING.md` - Common issues and resolutions

### Business Documentation
- [ ] `NEW_CLIENT_INTAKE_PROCESS.md` - Complete automation workflow
- [ ] `GHL_CONTACT_SCHEMA.md` - Custom fields and tags structure
- [ ] `GHL_PIPELINE_STRUCTURE.md` - Sales pipeline stages and automation
- [ ] `GHL_WEBHOOK_EVENTS.md` - Event types and payload examples

### Runbooks
- [ ] `GHL_OAUTH_RENEWAL.md` - Token refresh procedure
- [ ] `GHL_BACKUP_RESTORE.md` - Contact data backup/restore
- [ ] `GHL_DISASTER_RECOVERY.md` - Service recovery procedures

---

## 11. Risk Assessment

### Risk 1: Starter Plan Lacks API Access
- **Probability**: MEDIUM (conflicting reports)
- **Impact**: HIGH (requires plan upgrade)
- **Mitigation**: Test with 14-day trial before committing
- **Backup Plan**: Upgrade to Unlimited ($297/month, +$200/month cost)

### Risk 2: open-ghl-mcp Missing Features
- **Probability**: LOW (feature list comprehensive)
- **Impact**: MEDIUM (requires custom development)
- **Mitigation**: Validate all needed features in Phase 2
- **Backup Plan**: Build custom Node.js/TypeScript MCP server (1-2 weeks)

### Risk 3: Rate Limits Too Restrictive
- **Probability**: LOW (limits are generous)
- **Impact**: LOW (delays automation)
- **Mitigation**: Monitor usage during testing
- **Backup Plan**: Implement caching and batching in n8n

### Risk 4: OAuth Token Refresh Failures
- **Probability**: LOW (open-ghl-mcp handles this)
- **Impact**: MEDIUM (manual intervention required)
- **Mitigation**: Monitor token refresh logs daily
- **Backup Plan**: Store refresh token in GCP Secret Manager, automate renewal

### Risk 5: Webhook Delivery Failures
- **Probability**: MEDIUM (network/firewall issues)
- **Impact**: HIGH (breaks automation)
- **Mitigation**: Implement retry logic in n8n workflows
- **Backup Plan**: Poll GHL API for changes every 5 minutes

---

## 12. Success Criteria

### Technical Success
- ✅ MCP server runs on GCP VM without errors
- ✅ All MCP tools respond within 2 seconds
- ✅ OAuth token refresh works automatically
- ✅ Rate limits never exceeded
- ✅ Webhooks deliver to n8n 99% of the time
- ✅ Health check passes 99% of the time

### Business Success
- ✅ ALG contact record complete in GHL
- ✅ ARS contact record complete in GHL
- ✅ Client intake automation reduces manual work by 80%
- ✅ All systems stay in sync (GHL, ClickUp, Notion, GDrive)
- ✅ Team can onboard new clients in under 5 minutes
- ✅ Zero manual errors in client data entry

### Documentation Success
- ✅ All technical docs complete and accurate
- ✅ Team trained on client intake process
- ✅ Troubleshooting guide covers 90% of common issues
- ✅ Runbooks enable non-technical staff to resolve issues

---

## 13. Timeline Summary

| Phase | Days | Effort | Description |
|-------|------|--------|-------------|
| Phase 0 | 1-2 | 2-4 hours | Pre-deployment validation |
| Phase 1 | 2-3 | 2-3 hours | Local deployment |
| Phase 2 | 3-4 | 3-4 hours | MCP tool validation |
| Phase 3 | 4-5 | 2-3 hours | Docker containerization |
| Phase 4 | 5-6 | 2-3 hours | GCP deployment |
| Phase 5 | 6-7 | 3-4 hours | n8n integration |
| Phase 6 | 7-10 | 4-6 hours | Client intake automation |
| **Total** | **10 days** | **18-27 hours** | **Complete deployment** |

---

## 14. Budget & Resources

### Software Costs
- **GHL Starter Plan**: $97/month (or $970/year)
- **GHL Unlimited Plan**: $297/month (if Starter lacks API access)
- **SMS/Email Credits**: Pay-as-you-go (estimate $20/month)
- **Total Monthly Cost**: $97-$317 depending on plan tier

### Infrastructure Costs
- **GCP VM**: Covered by existing abound-infra-vm instance
- **Storage**: Negligible (<1GB for logs and tokens)
- **Network**: Minimal (API requests only)

### Personnel Costs
- **Deployment**: 18-27 hours (Drew W)
- **Testing**: 5-10 hours (Drew W + team)
- **Documentation**: 5-8 hours (Drew W)
- **Training**: 2-3 hours (entire team)
- **Total Time**: 30-48 hours

### Hardware Requirements
- **Development**: Docker Desktop on local machine
- **Production**: GCP VM (abound-infra-vm)
- **CPU**: 1 vCPU (minimal, Python process)
- **Memory**: 512MB-1GB RAM
- **Storage**: 2GB (code + logs + tokens)

---

## 15. Appendices

### Appendix A: GHL API v2 Endpoints

**Contacts**
- `GET /v2/locations/{locationId}/contacts` - List contacts
- `POST /v2/locations/{locationId}/contacts` - Create contact
- `GET /v2/contacts/{contactId}` - Get contact details
- `PUT /v2/contacts/{contactId}` - Update contact
- `DELETE /v2/contacts/{contactId}` - Delete contact

**Conversations**
- `GET /v2/conversations` - List conversations
- `POST /v2/conversations/{conversationId}/messages` - Send message
- `GET /v2/conversations/{conversationId}/messages` - Get messages

**Opportunities**
- `GET /v2/opportunities` - List opportunities
- `POST /v2/opportunities` - Create opportunity
- `PUT /v2/opportunities/{opportunityId}` - Update opportunity
- `DELETE /v2/opportunities/{opportunityId}` - Delete opportunity

**Calendar**
- `GET /v2/calendars` - List calendars
- `POST /v2/calendars/events` - Create event
- `GET /v2/calendars/events/{eventId}` - Get event details
- `PUT /v2/calendars/events/{eventId}` - Update event

### Appendix B: OAuth 2.0 Scopes

**Required Scopes for ATO**
- `contacts.readonly` - Read contact data
- `contacts.write` - Create/update/delete contacts
- `conversations.readonly` - Read message threads
- `conversations.message.readonly` - Read messages
- `conversations.message.write` - Send messages
- `opportunities.readonly` - Read opportunities
- `opportunities.write` - Create/update opportunities
- `calendars.readonly` - Read calendar events
- `calendars.write` - Create/update events

### Appendix C: open-ghl-mcp Repository Structure

```
open-ghl-mcp/
├── src/
│   ├── server.py              # MCP server entry point
│   ├── oauth_setup.py         # OAuth flow handler
│   ├── ghl_client.py          # GHL API client
│   ├── tools/
│   │   ├── contacts.py        # Contact CRUD operations
│   │   ├── conversations.py   # Message operations
│   │   ├── opportunities.py   # Deal operations
│   │   └── calendar.py        # Calendar operations
│   ├── resources/
│   │   ├── contacts.py        # Contact resource provider
│   │   ├── conversations.py   # Conversation resource provider
│   │   └── opportunities.py   # Opportunity resource provider
│   └── utils/
│       ├── auth.py            # Token management
│       ├── logger.py          # Logging utilities
│       └── errors.py          # Error handling
├── requirements.txt           # Python dependencies
├── .env.example               # Environment variable template
├── Dockerfile                 # Docker image definition
├── docker-compose.yml         # Docker Compose configuration
└── README.md                  # Repository documentation
```

### Appendix D: Contact Schema (ATO Standard)

```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "phone": "string",
  "tags": ["Client", "Translation Services"],
  "customFields": [
    {
      "id": "client_status",
      "value": "Active" // Active, Onboarding, Paused, Churned
    },
    {
      "id": "project_type",
      "value": "Website + CRM"
    },
    {
      "id": "clickup_project_id",
      "value": "90123456" // Link to ClickUp
    },
    {
      "id": "notion_page_id",
      "value": "abc123def456" // Link to Notion
    },
    {
      "id": "gdrive_folder_url",
      "value": "https://drive.google.com/..." // Link to GDrive
    }
  ]
}
```

---

## 16. Sign-Off

### Prepared By
- **Name**: Drew W
- **Role**: Infrastructure Lead
- **Date**: 2025-10-14

### Reviewed By
- **Name**: _____________
- **Role**: _____________
- **Date**: _____________

### Approved By
- **Name**: _____________
- **Role**: _____________
- **Date**: _____________

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-14 | Drew W | Initial draft |

---

**END OF DOCUMENT**
