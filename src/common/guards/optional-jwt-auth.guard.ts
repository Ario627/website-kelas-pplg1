import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";

@Injectable()
export class OptionalJwtAuthGUard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context)
  }


  handleRequest<TUser = any>(err: any, user: TUser): TUser | null {
    if (err || !user) {
      return null as any
    }
    return user;
  }
}
