import { plainToClass } from 'class-transformer';
import { IsString, IsNumber, IsOptional, validateSync, IsUrl, IsEnum, MinLength, Matches } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 4000;

  // Supabase
  @IsUrl()
  SUPABASE_URL: string;

  @IsString()
  @MinLength(20)
  SUPABASE_SERVICE_KEY: string;

  // JWT Configuration
  @IsString()
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters for production security' })
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d+[smhd]$/, { message: 'JWT_EXPIRATION must be a valid time format (e.g., 15m, 1h, 7d)' })
  JWT_EXPIRATION: string = '15m';

  @IsString()
  @IsOptional()
  @Matches(/^\d+[smhd]$/, { message: 'REFRESH_TOKEN_EXPIRATION must be a valid time format (e.g., 15m, 1h, 7d)' })
  REFRESH_TOKEN_EXPIRATION: string = '7d';

  // CORS
  @IsString()
  @IsOptional()
  CORS_ORIGIN: string = 'http://localhost:3000';

  // Throttling
  @IsNumber()
  @IsOptional()
  THROTTLE_TTL: number = 60000;

  @IsNumber()
  @IsOptional()
  THROTTLE_LIMIT: number = 100;

  // Logging
  @IsString()
  @IsOptional()
  @IsEnum(['error', 'warn', 'info', 'debug', 'verbose'])
  LOG_LEVEL: string = 'info';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Configuration validation error: ${errors.toString()}`);
  }

  // Additional production security checks
  if (validatedConfig.NODE_ENV === Environment.Production) {
    const insecurePatterns = [
      'CHANGE_ME',
      'your-super-secret',
      'default',
      'password',
      'secret123',
      'test',
    ];

    const jwtSecret = config.JWT_SECRET as string;
    if (insecurePatterns.some(pattern => jwtSecret?.toUpperCase().includes(pattern.toUpperCase()))) {
      throw new Error(
        'SECURITY ERROR: JWT_SECRET contains insecure placeholder text. ' +
        'Generate a secure random string for production using: openssl rand -base64 64'
      );
    }

    // Ensure CORS is properly configured for production
    if (config.CORS_ORIGIN === 'http://localhost:3000' || config.CORS_ORIGIN === '*') {
      throw new Error(
        'SECURITY ERROR: CORS_ORIGIN must be set to your production domain, not localhost or *'
      );
    }
  }

  return validatedConfig;
}
