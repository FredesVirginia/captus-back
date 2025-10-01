import { SetMetadata } from '@nestjs/common';
export const ROLES_KEY = 'roles';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);


export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);