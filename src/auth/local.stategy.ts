import { AuthService } from './auth.service';
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport"
import { Strategy } from "passport-local";
import { LoginUserDto } from 'src/user/dto/user.dto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy,'local') {
    constructor(private authService: AuthService) {
        super({
            usernameField: 'email',
            passwordField: 'password'
        })
    }

    async validate(user: LoginUserDto): Promise<any> { 
        const userData = await this.authService.validateUser(user);
        if (!userData) throw new UnauthorizedException({ message: "Invalid credentials" });

        return userData;
    }
}