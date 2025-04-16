import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy ,ExtractJwt} from "passport-jwt";
import { AuthUserDto } from "src/user/dto/user.dto";


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.SECRET_KEY,
        })
    }

    async validate(payload: AuthUserDto) {
        return {
            id: payload.id,
            email: payload.email,
            role: payload.role,
            name: payload.name
        }
    }
}