import { JwtService } from '@nestjs/jwt';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common"

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private jwtService: JwtService) { }

    async canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        const authorization = request.headers.authorization;
        const token = authorization?.split(' ')[1];
        if (!token) throw new UnauthorizedException();
        try {
            const tokenPayload = await this.jwtService.verifyAsync(token);
            request.user = {
                id: tokenPayload.id ? tokenPayload.id  : tokenPayload.sub,
                email: tokenPayload.email,
                role: tokenPayload.role,
                name: tokenPayload.name
            }
            return true
        } catch (error) {
            throw new UnauthorizedException()
        }
    }
}