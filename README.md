# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

This template provides a simple MCP server with OAuth2.1 authentication using SQLite database, perfect for development and small-scale production deployments.

## Features

- ✅ OAuth2.1 authentication with PKCE
- ✅ SQLite database (file-based, no external dependencies)
- ✅ Express.js server
- ✅ Development-friendly setup
- ✅ User management
- ✅ TypeScript with full type safety

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### 1. Clone and Setup

```bash
# Clone this template
git clone https://github.com/granular-software/template-express-oauth-sqlite.git my-mcp-server
cd my-mcp-server

# Install dependencies
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure it:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# OAuth Configuration
JWT_SECRET=your-secure-secret-key-here

# Server Configuration
SERVER_URL=http://localhost:3000
PORT=3000
```

### 3. Database Setup

Initialize the SQLite database:

```bash
npm run db:init
```

This will create a `data/oauth.db` file with the necessary tables.

### 4. Development

```bash
# Start development server
npm run dev

# The server will be available at http://localhost:3000
# MCP Inspector: http://localhost:3000
```

### 5. Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Project Structure

```
├── src/
│   ├── server.ts              # Main server file
│   ├── auth/
│   │   └── oauth.ts          # OAuth configuration
│   ├── storage/
│   │   └── sqlite-storage.ts # SQLite storage implementation
│   ├── data/
│   │   └── users.ts          # Demo users
│   └── resources/
│       └── example.ts        # Example MCP resource
├── data/
│   └── oauth.db              # SQLite database file
├── scripts/
│   └── init-db.js           # Database initialization script
├── env.example               # Environment variables template
└── README.md                 # This file
```

## OAuth2.1 Authentication

This template includes a complete OAuth2.1 implementation with:

- **PKCE (Proof Key for Code Exchange)** for enhanced security
- **Dynamic client registration** - no pre-configured credentials needed
- **User management** with SQLite storage
- **Token refresh** functionality
- **Customizable login page**

### Demo Users

The template includes demo users for testing:

- **alice@example.com** / `alice123` (read, write permissions)
- **bob@example.com** / `bob123` (read permissions only)

### OAuth Flow

1. Client registers dynamically with the server
2. User authenticates via the login page
3. Authorization code is issued with PKCE
4. Access token is exchanged for the code
5. API calls use the access token

## Database Schema

The SQLite storage automatically creates the following tables:

- `oauth_clients` - Registered OAuth clients
- `oauth_users` - User accounts
- `oauth_authorization_codes` - Authorization codes
- `oauth_access_tokens` - Access tokens
- `oauth_refresh_tokens` - Refresh tokens

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `JWT_SECRET` | Secret key for JWT tokens | Yes | - |
| `SERVER_URL` | Base URL of your server | Yes | - |
| `PORT` | Server port | No | 3000 |

## Development

### Adding Resources

Create new MCP resources in `src/resources/`:

```typescript
import { z } from "zod";
import { createResource } from "mcpresso";

const MyResourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  // ... your schema
});

export const myResource = createResource({
  name: "my-resource",
  schema: MyResourceSchema,
  uri_template: "my-resources/{id}",
  methods: {
    get: {
      handler: async ({ id }) => {
        // Your implementation
      },
    },
    // ... other methods
  },
});
```

### Customizing OAuth

Edit `src/auth/oauth.ts` to customize:

- Login page styling
- User authentication logic
- Supported scopes and grant types
- Token expiration times

## Production Considerations

1. **Security**: Change all default secrets and passwords
2. **Database**: SQLite is file-based, ensure proper backups
3. **SSL**: Ensure HTTPS is enabled in production
4. **Monitoring**: Add logging and monitoring
5. **Backup**: Implement database backup strategy

## Troubleshooting

### Common Issues

1. **Database Lock**: Ensure only one process accesses the SQLite file
2. **Port Conflicts**: Change `PORT` in `.env` if 3000 is in use
3. **File Permissions**: Ensure write permissions for the `data/` directory

### Logs

Check logs for debugging:

```bash
# Application logs
npm run dev

# Database file location
ls -la data/oauth.db
```

## License

MIT License - see LICENSE file for details.

## Support

- GitHub Issues: https://github.com/granular-software/mcpresso
- Documentation: https://github.com/granular-software/mcpresso 