import { IdentityService } from "./identity";
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import type { Request, Response } from "express";


@Injectable()
export class IdentityGuard implements CanActivate {
  constructor(private readonly identity: IdentityService) { }

  canActivate(cxt: ExecutionContext): boolean {
    const req = cxt.switchToHttp().getRequest<Request>();
    const res = cxt.switchToHttp().getRequest<Response>();

    const user = (req as any).user ?? null;

    (req as any).__identity = this.identity.resolve(req, res, user);

    return true;
  }
}
