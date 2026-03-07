import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "src/common/guards/jwt.guard";
import type { Request, Response } from "express";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { Roles } from "src/common/decorators/roles.decorators";
import { RolesGuard } from "src/common/guards/role.guard";
import { User, UserRole } from "src/users/entities/user.entities";
import { Throttle } from "@nestjs/throttler";
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CurrentUser } from "src/common/decorators/current-user.decorators";
import { AuthGuard } from "@nestjs/passport";


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    const ipAddres = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];
    return this.authService.register(registerDto, ipAddres, userAgent);
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0];
    }
    if (Array.isArray(forwarded)) {
      return forwarded[0];
    }

    return req.ip || req.socket?.remoteAddress || 'Unknown';
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 10 } })
  async login(@Body() loginDto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ipAddres = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.login(loginDto, ipAddres, userAgent);

    this.setAuthCookies(res, result.access_token, result.refresh_token);

    return { user: result.user };
  }



  @Get('approve/:token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async approveFromEmail(
    @Param('token', ParseUUIDPipe) token: string,
    @Res() res: Response,
  ) {
    try {
      const result = await this.authService.approveRegistration(token)
      return res.status(200).json({
        message: 'Registration approved successfully',
        wouldRedirectTo: result.redirectUrl
      })
    } catch (error) {
      return res.redirect(`/error?message=${encodeURIComponent(error.message)}`);
    }
  }

  @Get('reject/:token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async rejectFromEmail(
    @Param('token', ParseUUIDPipe) token: string,
    @Query('reason') reason: string,
    @Res() res: Response,
  ) {
    try {
      const result = await this.authService.rejectRegristration(token, reason);
      return res.redirect(result.redirectUrl);
    } catch (error) {
      return res.redirect(`/error?message=${encodeURIComponent(error.message)}`);
    }
  }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.OK)
  async refresh(@CurrentUser() user: User & { refreshToken: string }, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.refreshTokens(user.id, user.refreshToken);

    this.setAuthCookies(res, tokens.access_token, tokens.refresh_token);

    return { message: tokens.message };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: User, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(user.id);

    this.clearAuthCookies(res);

    return { message: 'Logout successful' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: User) {
    return this.authService.getCurrentUser(user.id)
  }

  // --- Cookie helpers ---

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
  }
}
