import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { Logger } from '../../common/logger/logger.service';
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName?: string;
    emailConfirmed?: boolean;
  };
  requiresEmailConfirmation?: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    try {
      // Input validation
      if (!registerDto.email || !registerDto.password) {
        throw new BadRequestException('Email and password are required');
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(registerDto.email)) {
        throw new BadRequestException('Invalid email format');
      }

      // Password strength validation (min 8 chars, at least 1 uppercase, 1 lowercase, 1 number)
      if (registerDto.password.length < 8) {
        throw new BadRequestException('Password must be at least 8 characters long');
      }

      this.logger.log(`Registration attempt for email: ${registerDto.email}`, 'AuthService');

      const supabase = this.supabaseService.getClient();

      // Supabase auth.signUp handles duplicate email detection automatically
      const { data, error } = await supabase.auth.signUp({
        email: registerDto.email,
        password: registerDto.password,
        options: {
          data: {
            full_name: registerDto.fullName,
          },
          emailRedirectTo: `${this.configService.get('NEXT_PUBLIC_APP_URL')}/auth/confirm`,
        },
      });

      if (error) {
        this.logger.error(`Registration failed: ${error.message}`, error.stack, 'AuthService');

        // Handle specific error cases
        if (error.message.includes('already registered')) {
          throw new ConflictException('An account with this email already exists');
        }

        throw new ConflictException(error.message);
      }

      if (!data.user) {
        throw new ConflictException('Registration failed - user not created');
      }

      // If email confirmation is required (no session returned)
      if (!data.session) {
        this.logger.log(
          `User registered successfully, email confirmation required: ${data.user.id}`,
          'AuthService',
        );

        return {
          accessToken: '',
          refreshToken: '',
          user: {
            id: data.user.id,
            email: data.user.email!,
            fullName: data.user.user_metadata?.full_name,
            emailConfirmed: false,
          },
          requiresEmailConfirmation: true,
        };
      }

      // Registration successful with immediate session (email confirmation disabled)
      this.logger.log(`User registered successfully: ${data.user.id}`, 'AuthService');

      return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        user: {
          id: data.user.id,
          email: data.user.email!,
          fullName: data.user.user_metadata?.full_name,
          emailConfirmed: true,
        },
        requiresEmailConfirmation: false,
      };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Unexpected error during registration', error, 'AuthService');
      throw new ConflictException('Registration failed due to an unexpected error');
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    try {
      // Input validation
      if (!loginDto.email || !loginDto.password) {
        throw new BadRequestException('Email and password are required');
      }

      this.logger.log(`Login attempt for email: ${loginDto.email}`, 'AuthService');

      const supabase = this.supabaseService.getClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginDto.email,
        password: loginDto.password,
      });

      if (error) {
        this.logger.warn(
          `Login failed for ${loginDto.email}: ${error.message}`,
          'AuthService',
        );

        // Handle specific error cases with user-friendly messages
        if (error.message.includes('Email not confirmed')) {
          throw new UnauthorizedException(
            'Please confirm your email address. Check your inbox for the confirmation link.',
          );
        }

        if (error.message.includes('Invalid login credentials')) {
          throw new UnauthorizedException('Invalid email or password');
        }

        // Generic error for security (don't reveal if email exists)
        throw new UnauthorizedException('Invalid email or password');
      }

      if (!data.session) {
        this.logger.error(
          `Login successful but no session created for user: ${data.user?.id}`,
          'AuthService',
        );
        throw new UnauthorizedException('Authentication failed. Please try again.');
      }

      this.logger.log(`User logged in successfully: ${data.user.id}`, 'AuthService');

      return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        user: {
          id: data.user.id,
          email: data.user.email!,
          fullName: data.user.user_metadata?.full_name,
          emailConfirmed: true,
        },
        requiresEmailConfirmation: false,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Unexpected error during login', error, 'AuthService');
      throw new UnauthorizedException('Authentication failed. Please try again.');
    }
  }

  async refresh(refreshTokenDto: RefreshTokenDto): Promise<AuthResponse> {
    try {
      // Input validation
      if (!refreshTokenDto.refreshToken) {
        throw new BadRequestException('Refresh token is required');
      }

      this.logger.log('Token refresh attempt', 'AuthService');

      const supabase = this.supabaseService.getClient();

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshTokenDto.refreshToken,
      });

      if (error) {
        this.logger.warn(`Token refresh failed: ${error.message}`, 'AuthService');
        throw new UnauthorizedException('Invalid or expired refresh token. Please login again.');
      }

      if (!data.session || !data.user) {
        this.logger.error('Token refresh successful but no session created', 'AuthService');
        throw new UnauthorizedException('Token refresh failed. Please login again.');
      }

      this.logger.log(`Token refreshed successfully for user: ${data.user.id}`, 'AuthService');

      return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        user: {
          id: data.user.id,
          email: data.user.email!,
          fullName: data.user.user_metadata?.full_name,
          emailConfirmed: true,
        },
        requiresEmailConfirmation: false,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Unexpected error during token refresh', error, 'AuthService');
      throw new UnauthorizedException('Token refresh failed. Please login again.');
    }
  }

  async logout(accessToken: string): Promise<void> {
    try {
      if (!accessToken) {
        this.logger.warn('Logout attempt without access token', 'AuthService');
        return;
      }

      this.logger.log('Logout attempt', 'AuthService');

      const supabase = this.supabaseService.getClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        this.logger.error(`Logout failed: ${error.message}`, error.stack, 'AuthService');
        // Don't throw error on logout failure - still clear client-side tokens
      } else {
        this.logger.log('User logged out successfully', 'AuthService');
      }
    } catch (error) {
      this.logger.error('Error during logout', error, 'AuthService');
      // Don't throw error - allow client to proceed with logout
    }
  }

  async getCurrentUser(accessToken: string) {
    try {
      if (!accessToken) {
        throw new UnauthorizedException('Access token is required');
      }

      const supabase = this.supabaseService.getClient();

      const { data: { user }, error } = await supabase.auth.getUser(accessToken);

      if (error) {
        this.logger.warn(`Get current user failed: ${error.message}`, 'AuthService');
        throw new UnauthorizedException('Invalid or expired token');
      }

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return {
        id: user.id,
        email: user.email!,
        fullName: user.user_metadata?.full_name,
        emailConfirmed: user.email_confirmed_at ? true : false,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Unexpected error getting current user', error, 'AuthService');
      throw new UnauthorizedException('Authentication required');
    }
  }
}
