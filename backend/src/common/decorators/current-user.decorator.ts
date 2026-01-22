import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Current User Decorator
 *
 * Extracts user from request context
 * @param data - Optional property name to extract from user object (e.g., 'id', 'email')
 * @returns User object or specified property
 *
 * @example
 * // Get entire user object
 * @CurrentUser() user: User
 *
 * // Get only user ID
 * @CurrentUser('id') userId: string
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If a specific property is requested (e.g., 'id'), return only that property
    if (data && user) {
      return user[data];
    }

    // Otherwise return the entire user object
    return user;
  },
);