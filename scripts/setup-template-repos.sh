#!/bin/bash

# Script to set up template repositories for GitHub publishing
# This script creates the necessary structure for publishing templates to GitHub

set -e

echo "🚀 Setting up template repositories for GitHub publishing..."

# Create .gitignore files for templates
echo "📝 Creating .gitignore files..."

cat > apps/template-docker-oauth-postgresql/.gitignore << EOF
node_modules/
dist/
.env
*.log
.DS_Store
EOF

cat > apps/template-express-oauth-sqlite/.gitignore << EOF
node_modules/
dist/
.env
data/oauth.db
*.log
.DS_Store
EOF

cat > apps/template-express-no-auth/.gitignore << EOF
node_modules/
dist/
.env
*.log
.DS_Store
EOF

# Create LICENSE files for templates
echo "📄 Creating LICENSE files..."

cat > apps/template-docker-oauth-postgresql/LICENSE << EOF
MIT License

Copyright (c) 2024 Granular Software

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

cp apps/template-docker-oauth-postgresql/LICENSE apps/template-express-oauth-sqlite/LICENSE
cp apps/template-docker-oauth-postgresql/LICENSE apps/template-express-no-auth/LICENSE

# Create README files for GitHub repositories
echo "📚 Creating GitHub README files..."

cat > apps/template-docker-oauth-postgresql/GITHUB_README.md << EOF
# Template: Docker + OAuth2.1 + PostgreSQL

This is a template repository for creating MCP servers with OAuth2.1 authentication and PostgreSQL database, containerized with Docker.

## Features

- ✅ OAuth2.1 authentication with PKCE
- ✅ PostgreSQL database with connection pooling
- ✅ Docker containerization
- ✅ Production-ready setup
- ✅ User management and token refresh
- ✅ TypeScript with full type safety
- ✅ Express.js server

## Quick Start

\`\`\`bash
# Clone this template
git clone https://github.com/granular-software/template-docker-oauth-postgresql.git my-mcp-server
cd my-mcp-server

# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Start with Docker Compose
npm run docker:compose

# Or start development server
npm run dev
\`\`\`

## Documentation

See the [README.md](README.md) file for detailed documentation.

## License

MIT License - see [LICENSE](LICENSE) file for details.
EOF

cat > apps/template-express-oauth-sqlite/GITHUB_README.md << EOF
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

\`\`\`bash
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
\`\`\`

## Documentation

See the [README.md](README.md) file for detailed documentation.

## License

MIT License - see [LICENSE](LICENSE) file for details.
EOF

cat > apps/template-express-no-auth/GITHUB_README.md << EOF
# Template: Express + No Authentication

This is a template repository for creating simple MCP servers without authentication, perfect for public APIs.

## Features

- ✅ No authentication required
- ✅ Express.js server
- ✅ Simple setup
- ✅ Perfect for public APIs
- ✅ Development-friendly
- ✅ TypeScript with full type safety

## Quick Start

\`\`\`bash
# Clone this template
git clone https://github.com/granular-software/template-express-no-auth.git my-mcp-server
cd my-mcp-server

# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Start development server
npm run dev
\`\`\`

## Documentation

See the [README.md](README.md) file for detailed documentation.

## License

MIT License - see [LICENSE](LICENSE) file for details.
EOF

echo "✅ Template repositories setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Create GitHub repositories for each template"
echo "2. Push the template code to GitHub"
echo "3. Update the CLI template manager with the GitHub URLs"
echo ""
echo "🎯 Template locations:"
echo "  - apps/template-docker-oauth-postgresql/"
echo "  - apps/template-express-oauth-sqlite/"
echo "  - apps/template-express-no-auth/" 