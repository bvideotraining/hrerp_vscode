import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // 1. Prefer HTTP-only cookie
    let token: string | undefined = request.cookies?.jwtToken;

    // 2. Fall back to Authorization: Bearer header (e.g. Swagger / API clients)
    if (!token) {
      const authHeader: string | undefined = request.headers['authorization'];
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const payload = this.jwtService.verify(token);
      // Expose all JWT claims on req.user so controllers can read them
      request.user = {
        sub:         payload.sub,
        id:          payload.sub,
        email:       payload.email,
        role:        payload.role,
        accessType:  payload.accessType,
        employeeId:  payload.employeeId,
        employeeCode: payload.employeeCode,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
