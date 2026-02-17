import { ExecutionContext, Injectable, Logger, createParamDecorator } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";

export type IdentityType = 'authenticated' | 'visitor' | 'anonymous';

export interface ResolvedIdentity {
  type: IdentityType;
  identifier: string;
  userId: number | null;
  visitorId: string | null;
  fingerprintHash: string;
  ipAddress: string;
  userAgent: string;
}

export const Identity = createParamDecorator(
  (data: keyof ResolvedIdentity | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const identity = req.__identity as ResolvedIdentity | undefined;
    if (!identity) return null;
    return data ? identity[data] : identity;
  },
);

// Jantung nya 3 layer

@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);
  private readonly cookieName: string;
  private readonly secret: string;
  private readonly isProduction: boolean;

  constructor(private readonly config: ConfigService) {
    this.cookieName = '__vid';
    this.secret = this.config.getOrThrow<string>('VISITOR_COOKIE_SECRET');
    this.isProduction = this.config.get('NODE_ENV') === 'production';
  }

  getIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    if (Array.isArray(forwarded)) return forwarded[0].trim();
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  fingerprint(ip: string, ua: string): string {
    return createHash('sha256')
      .update(`${ip}::${ua}::${this.secret}`)
      .digest('hex')
      .substring(0, 32);
  }

  private sign(value: string): string {
    return createHash('sha256')
      .update(`${value}::${this.secret}`)
      .digest('hex')
      .substring(0, 16);
  }

  getVisitorId(req: Request): string | null {
    const raw = req.cookies?.[this.cookieName];
    if (!raw || typeof raw !== 'string') return null;

    const dotIndex = raw.lastIndexOf('.');
    if (dotIndex === -1) return null;

    const id = raw.substring(0, dotIndex);
    const sig = raw.substring(dotIndex + 1);
    const expected = this.sign(id);

    if (sig.length !== expected.length) return null;
    const isValid = timingSafeEqual(Buffer.from(sig), Buffer.from(expected));

    if (!isValid) {
      this.logger.warn(`Invalid visitor cookie signature: ${sig} (expected: ${expected})`);
      return null;
    }

    return id;
  }

  private createVisitorCookie(res: Response): string {
    const id = randomUUID();
    const signed = `${id}.${this.sign(id)}`;

    res.cookie(this.cookieName, signed, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 tahun
      path: '/',
    });

    return id;
  }

  private ensureVisitorCookie(req: Request, res: Response): void {
    if (!this.getVisitorId(req)) {
      this.createVisitorCookie(res);
    }
  }

  resolve(req: Request, res: Response, user?: { id: number } | null): ResolvedIdentity {
    const ipAddress = this.getIp(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    const fingerprintHash = this.fingerprint(ipAddress, userAgent);

    if (user?.id) {
      this.ensureVisitorCookie(req, res);

      return {
        type: 'authenticated',
        identifier: String(user.id),
        userId: user.id,
        visitorId: this.getVisitorId(req),
        fingerprintHash,
        ipAddress,
        userAgent,
      };
    }

    let visitorId = this.getVisitorId(req);
    if (!visitorId) {
      visitorId = this.createVisitorCookie(res);
    }

    if (visitorId) {
      return {
        type: 'visitor',
        identifier: visitorId,
        userId: null,
        visitorId,
        fingerprintHash,
        ipAddress,
        userAgent,
      };
    }

    return {
      type: 'anonymous',
      identifier: fingerprintHash,
      userId: null,
      visitorId: null,
      fingerprintHash,
      ipAddress,
      userAgent,
    }
  }
}
