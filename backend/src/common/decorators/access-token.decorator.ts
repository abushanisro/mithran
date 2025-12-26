import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract the user's access token from the request
 * Used to create authenticated Supabase clients for RLS
 */
export const AccessToken = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.accessToken;
  },
);
