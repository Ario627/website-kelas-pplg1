import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "src/common/guards/jwt.guard";
import type { Request, Response } from "express";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { Roles } from "src/common/decorators/roles.decorators";
import { RolesGuard } from "src/common/guards/role.guard";
import { User, UserRole } from "src/users/entities/user.entities";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
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
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const ipAddres = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];
    return this.authService.login(loginDto, ipAddres, userAgent);
  }



  @Get('approve/:token')
  //@UseGuards(JwtAuthGuard, RolesGuard)
  //@Roles(UserRole.ADMIN)
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
      return res.redirect(`/error?meesage=${encodeURIComponent(error.message)}`);
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: User) {
    return this.authService.getCurrentUser(user.id)
  }
}
