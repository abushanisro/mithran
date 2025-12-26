# Mithran - Production Deployment Guide

This is a production-ready manufacturing cost modeling platform built with Next.js 16 and NestJS.

## What's Been Done

### Security Hardening
- ✅ Removed all exposed credentials from codebase
- ✅ Implemented strong environment variable validation (JWT_SECRET min 32 chars, required fields)
- ✅ Production-specific credential checks that prevent deployment with placeholder values
- ✅ Updated Docker Compose to use environment variables instead of hardcoded credentials
- ✅ Enhanced error handling to prevent information leakage in production (generic 500 error messages)
- ✅ Removed all demo data and seed scripts
- ✅ Consolidated authentication to single backend-based approach

### Code Quality
- ✅ Removed incomplete modules (Materials, BOM, Cost - were using disabled TypeORM)
- ✅ Removed dual authentication system (now using BackendAuthProvider only)
- ✅ Removed API test page
- ✅ Cleaned up all TODO comments
- ✅ All console.log statements are development-only (wrapped in isDevelopment checks)

### Production Features
- ✅ Winston logger with daily rotation (14 days app logs, 30 days error logs)
- ✅ Helmet security headers (CSP, HSTS, XSS protection, clickjacking protection)
- ✅ Rate limiting (100 requests/minute by default)
- ✅ CORS protection
- ✅ Input validation with class-validator
- ✅ Docker healthchecks configured

## Environment Variables Setup

### Required Variables

Create a `.env` file based on `.env.example` and set these **CRITICAL** values:

```bash
# Generate strong credentials:
# For JWT_SECRET: openssl rand -base64 64
# For passwords: openssl rand -base64 32

# Supabase (get from your Supabase project)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_actual_supabase_service_key

# JWT Configuration - MUST be 32+ characters
JWT_SECRET=<generate using: openssl rand -base64 64>
JWT_EXPIRATION=15m
REFRESH_TOKEN_EXPIRATION=7d

# Production CORS - set to your actual frontend URL
CORS_ORIGIN=https://yourdomain.com

# Database Credentials (if using Docker services)
POSTGRES_PASSWORD=<generate using: openssl rand -base64 32>
REDIS_PASSWORD=<generate using: openssl rand -base64 32>
RABBITMQ_DEFAULT_PASS=<generate using: openssl rand -base64 32>
MINIO_ROOT_PASSWORD=<generate using: openssl rand -base64 32>

# Production settings
NODE_ENV=production
LOG_LEVEL=info
```

### Environment Validation

The application will **FAIL TO START** if:
- `JWT_SECRET` is less than 32 characters
- `JWT_SECRET` contains placeholder text like "CHANGE_ME", "default", "password"
- `CORS_ORIGIN` is set to `*` or `localhost` in production
- Required Supabase credentials are missing

This prevents accidental deployment with insecure configurations.

## Deployment

### Frontend (Vercel/Netlify)

```bash
# Build
npm run build

# Environment variables to set:
NEXT_PUBLIC_API_GATEWAY_URL=https://api.yourdomain.com/api/v1
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NODE_ENV=production
```

### Backend (Railway/Render/Heroku)

```bash
cd backend
npm run build
npm run start:prod
```

**Environment variables**: Set all variables from `.env.example` with secure values.

### Docker Deployment

```bash
# Backend with Docker Compose
cd backend
docker-compose up -d

# Ensure .env file is properly configured
```

## Security Checklist

Before deploying to production:

- [ ] Generate strong random JWT_SECRET (min 64 characters): `openssl rand -base64 64`
- [ ] Set CORS_ORIGIN to your actual domain
- [ ] Use real Supabase credentials (not examples from docs)
- [ ] Generate strong passwords for all Docker services
- [ ] Enable HTTPS/SSL for all endpoints
- [ ] Set NODE_ENV=production
- [ ] Review and configure rate limits for your traffic
- [ ] Set up monitoring (Sentry, Datadog, etc.)
- [ ] Configure log aggregation (ELK, CloudWatch, etc.)
- [ ] Enable Supabase Row Level Security (RLS) policies
- [ ] Regular security audits and dependency updates

## Architecture

### Tech Stack
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: NestJS 10, Supabase (PostgreSQL + Auth)
- **Authentication**: Backend API with Supabase Auth
- **Validation**: class-validator + Zod
- **Logging**: Winston with daily rotation
- **Security**: Helmet, Rate Limiting, CORS, Input Validation

### Available Modules
- ✅ Authentication (login, register, logout, token refresh)
- ✅ Projects (CRUD operations)
- ✅ Vendors (CRUD operations)
- ✅ Health checks

### Database
- PostgreSQL via Supabase
- Row Level Security (RLS) enabled
- Migrations in `/backend/migrations/`

## API Documentation

Once deployed, Swagger documentation is available at:
```
https://api.yourdomain.com/api/docs
```

## Monitoring & Logs

### Log Files
- `backend/logs/application-YYYY-MM-DD.log` - All logs (14 day retention)
- `backend/logs/error-YYYY-MM-DD.log` - Error logs only (30 day retention)

### Log Levels
- Production: `info` (configurable via LOG_LEVEL)
- Development: `debug`

### Recommended Integrations
- **Error Tracking**: Sentry
- **APM**: Datadog, New Relic
- **Log Aggregation**: ELK Stack, CloudWatch
- **Uptime Monitoring**: Pingdom, UptimeRobot

## Performance

- Database queries use Supabase client (parameterized - SQL injection safe)
- React Query caching on frontend (5min stale time)
- Request deduplication
- Rate limiting (100 req/min default)

## Support & Troubleshooting

### Common Issues

**Backend won't start**:
- Check environment variables are set correctly
- Verify Supabase credentials
- Check logs in `backend/logs/`

**401 Unauthorized errors**:
- Verify JWT_SECRET matches between deployments
- Check token hasn't expired
- Clear browser localStorage and login again

**CORS errors**:
- Ensure CORS_ORIGIN matches your frontend URL exactly
- Include protocol (https://) and no trailing slash

### Health Checks

```bash
# Backend health
curl https://api.yourdomain.com/health

# Database connectivity
curl https://api.yourdomain.com/health/db
```

## Security Incident Response

If credentials are compromised:
1. Immediately rotate JWT_SECRET
2. Revoke Supabase service keys and generate new ones
3. Force logout all users (they'll need to re-authenticate)
4. Audit logs for unauthorized access
5. Update all environment variables in deployment platform

---

## Next Steps

Consider adding:
- End-to-end tests (Playwright/Cypress)
- CI/CD pipeline with automated testing
- Database backup strategy
- CDN for static assets
- Redis caching layer
- Real-time features with Supabase Realtime
- Email notifications
- Multi-factor authentication
- API versioning strategy

---

**Built with security and best practices in mind. Ready for production deployment.**
