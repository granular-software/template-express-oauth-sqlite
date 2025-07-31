# Template: Express + OAuth2.1 + SQLite

This is a template repository for creating simple MCP servers with OAuth2.1 authentication using SQLite database.

## Features

- ✅ OAuth2.1 authentication with PKCE
- ✅ SQLite database (file-based, no external dependencies)
- ✅ Express.js server
- ✅ Development-friendly setup
- ✅ User management
- ✅ TypeScript with full type safety

## Quick Start

```bash
# Clone this template
git clone https://github.com/granular-software/template-express-oauth-sqlite.git my-mcp-server
cd my-mcp-server

# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Initialize database
npm run db:init

# Start development server
npm run dev
```

## Documentation

See the [README.md](README.md) file for detailed documentation.

## License

MIT License - see [LICENSE](LICENSE) file for details.
