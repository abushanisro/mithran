# Mithran API Gateway

Enterprise-grade API Gateway for the Mithran manufacturing cost modeling platform. Built with NestJS, TypeScript, and Supabase.

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account ([create one free](https://supabase.com))

### Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials
```

### Database Setup

```bash
# Validate your environment configuration
npm run env:validate

# Run database migrations
npm run db:migrate

# (Optional) Seed sample data for development
npm run db:seed
```

For detailed database setup instructions, see [DATABASE_SETUP.md](./DATABASE_SETUP.md)

### Development

```bash
# Start in development mode with hot-reload
npm run start:dev

# Server will start on http://localhost:4000
# API docs available at http://localhost:4000/api
```

## Available Scripts

### Development

- `npm run start:dev` - Start development server with hot-reload
- `npm run start:debug` - Start in debug mode
- `npm run build` - Build for production
- `npm run start:prod` - Run production build

### Database Management

- `npm run db:migrate` - Run pending database migrations
- `npm run db:migrate:reset` - ⚠️ Reset database (drops all tables)
- `npm run db:seed` - Populate with sample data (dev only)
- `npm run env:validate` - Validate environment configuration

### Code Quality

- `npm run lint` - Lint and fix code
- `npm run format` - Format code with Prettier
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Run tests with coverage
- `npm run test:e2e` - Run end-to-end tests

## Architecture

```
backend/
├── src/
│   ├── common/              # Shared modules
│   │   ├── database/        # Database health & utilities
│   │   ├── guards/          # Authentication guards
│   │   ├── logger/          # Logging service
│   │   └── supabase/        # Supabase client
│   ├── config/              # Configuration files
│   ├── modules/             # Feature modules
│   │   ├── auth/            # Authentication
│   │   ├── projects/        # Project management
│   │   ├── vendors/         # Vendor management
│   │   ├── materials/       # Materials catalog
│   │   ├── bom/             # Bill of Materials
│   │   ├── cost/            # Cost analysis
│   │   └── health/          # Health checks
│   └── main.ts              # Application entry point
├── scripts/
│   ├── run-migrations.ts    # Migration runner
│   ├── seed-data.ts         # Database seeding
│   └── validate-env.ts      # Environment validator
├── migrations/              # SQL migration files
└── test/                    # Test files

```

## Key Features

### Security

- **Row Level Security (RLS)** - All database operations respect user permissions
- **JWT Authentication** - Secure token-based auth via Supabase
- **Rate Limiting** - Protect against abuse with configurable throttling
- **CORS Protection** - Controlled cross-origin access
- **Helmet Security** - HTTP headers hardening

### Database

- **Automated Migrations** - Version-controlled schema management
- **Health Monitoring** - Startup health checks ensure database readiness
- **Connection Pooling** - Efficient PostgreSQL connections
- **TypeORM Integration** - Type-safe database operations

### Development Experience

- **Hot Reload** - Instant feedback during development
- **Swagger/OpenAPI** - Auto-generated API documentation
- **Structured Logging** - Winston-based logging with rotation
- **TypeScript** - Full type safety and IntelliSense
- **Environment Validation** - Catch configuration errors early

## API Endpoints

### Health & Status

- `GET /health` - Application health check
- `GET /api` - API documentation (Swagger UI)

### Projects

- `GET /api/v1/projects` - List all projects
- `POST /api/v1/projects` - Create new project
- `GET /api/v1/projects/:id` - Get project details
- `PATCH /api/v1/projects/:id` - Update project
- `DELETE /api/v1/projects/:id` - Delete project
- `GET /api/v1/projects/:id/cost-analysis` - Get cost analysis

### Vendors

- `GET /api/v1/vendors` - List all vendors
- `POST /api/v1/vendors` - Create new vendor
- `GET /api/v1/vendors/:id` - Get vendor details
- `PATCH /api/v1/vendors/:id` - Update vendor
- `DELETE /api/v1/vendors/:id` - Delete vendor

*Full API documentation available at `/api` when running the server*

## Configuration

### Environment Variables

See [`.env.example`](./.env.example) for all available configuration options.

Critical variables:

```env
# Database connection
DATABASE_HOST=db.xxxxx.supabase.co
DATABASE_PASSWORD=your-password

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Server
PORT=4000
NODE_ENV=development
```

## Troubleshooting

### Database Connection Errors

```bash
# Validate your environment configuration
npm run env:validate

# Check if migrations have been run
npm run db:migrate
```

### Missing Tables Error

```
Error: Could not find the table 'public.projects'
```

**Solution**: Run migrations to create tables
```bash
npm run db:migrate
```

### TypeScript Compilation Errors

```bash
# Clean and rebuild
rm -rf dist/
npm run build
```

## Production Deployment

1. **Environment Configuration**
   ```bash
   # Set production environment variables
   NODE_ENV=production
   DATABASE_SSL=true
   ```

2. **Build Application**
   ```bash
   npm run build
   ```

3. **Run Migrations**
   ```bash
   npm run db:migrate
   ```

4. **Start Server**
   ```bash
   npm run start:prod
   ```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `npm test`
4. Run linter: `npm run lint`
5. Submit a pull request

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) - Progressive Node.js framework
- **Language**: [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- **Database**: [Supabase](https://supabase.com/) - PostgreSQL with built-in auth
- **ORM**: [TypeORM](https://typeorm.io/) - TypeScript ORM
- **Validation**: [class-validator](https://github.com/typestack/class-validator) - Decorator-based validation
- **Documentation**: [Swagger/OpenAPI](https://swagger.io/) - Auto-generated API docs
- **Logging**: [Winston](https://github.com/winstonjs/winston) - Flexible logging
- **Testing**: [Jest](https://jestjs.io/) - Delightful testing framework

## License

UNLICENSED - Private/Proprietary

## Support

For setup assistance, see [DATABASE_SETUP.md](./DATABASE_SETUP.md)

For issues, contact the Mithran development team.
