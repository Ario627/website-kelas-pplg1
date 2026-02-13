import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "src/users/entities/users.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { RegistrationStatus, User, UserRole } from "src/users/entities/user.entities";
import { MeResponse } from "./dto/response.dto";


@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly requireApproval: boolean;
  private readonly backendUrl: string;
  private readonly frontendUrl: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    //tinggal yang main service 
  ) {
    this.requireApproval = this.configService.get<string>('REQUIRE_ADMIN_APPROVAL', 'true') === 'true';
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');
    this.backendUrl = this.configService.get<string>('BACKEND_URL', 'http://localhost:3000/api');
  }

  //Pembuat access token dan refresh token dengan HELPER
  async getTokens(userId: number, email: string, role: UserRole) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH'),
        expiresIn: '7d',
      }),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  // Menyimpan refresh token yang sudah di hash ke database
  private async updateRefreshToken(userId: number, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.usersService.update(userId, {
      refreshToken: hash,
    });
  }

  async register(registerDto: RegisterDto, ipAddress?: string, userAgent?: string) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      return new ConflictException('Email already in use');
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);

    const registrationToken = uuidv4();

    const registrationStatus = this.requireApproval ? RegistrationStatus.PENDING : RegistrationStatus.APPROVED;

    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
      registrationStatus,
      registrationToken: this.requireApproval ? registrationToken : null,
      approvedAt: this.requireApproval ? null : new Date(),
    });

    this.logger.log(`New user registered: ${user.email} from IP: ${ipAddress}, User-Agent: ${userAgent}`);

    return {
      message: 'Registration successful',
      status: 'approved',
      emaill: user.email,
      debugToken: process.env.NODE_ENV === 'development' ? registrationToken : undefined,
    };
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.registrationStatus === RegistrationStatus.PENDING) {
      throw new ForbiddenException('Invalid credentials');
    }
    if (user.registrationStatus === RegistrationStatus.REJECTED) {
      throw new ForbiddenException('User registration has been rejected');
    }
    if (!user.isActive) {
      throw new ForbiddenException('User account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.usersService.updateLoginInfo(user.id, ipAddress);

    const tokens = await this.getTokens(user.id, user.email, user.role);

    await this.updateRefreshToken(user.id, tokens.refresh_token);

    this.logger.log(`User logged in: ${user.email} from IP: ${ipAddress}`);

    return {
      message: 'Login successful',
      status: 'approved',
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        regristrationStatus: user.registrationStatus,
      },
    };
  }

  async logout(userId: number) {
    await this.usersService.update(userId, {
      refreshToken: null,
    });

    return { message: 'Logout successful' };
  }

  async refreshTokens(userId: number, refreshToken: string) {
    const user = await this.usersService.findOne(userId);

    if (!user || !user.refreshToken) {
      throw new ForbiddenException('Access denied');
    }

    const refreshTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);

    if (!refreshTokenValid) {
      throw new ForbiddenException('Access denied');
    }

    const token = await this.getTokens(user.id, user.email, user.role);

    await this.updateRefreshToken(user.id, token.refresh_token);

    this.logger.log(`Tokens refreshed for user: ${user.email}`);

    return {
      message: 'Tokens refreshed successfully',
      ...token,
    };
  }

  async approveRegistration(token: string, adminIs?: number) {
    const user = await this.usersService.findBYRegistrationToken(token);

    if (!user) {
      throw new BadRequestException('Invalid registration token');
    }

    if (user.registrationStatus !== RegistrationStatus.PENDING) {
      throw new BadRequestException('User registration is not pending');
    }

    await this.usersService.update(user.id, {
      registrationStatus: RegistrationStatus.APPROVED,
      registrationToken: null,
      approvedAt: new Date(),
    });

    this.logger.log(`User registration approved: ${user.email} by Admin ID: ${adminIs}`);

    return {
      message: `Registration for ${user.email} has been approved`,
      redirectUrl: `${this.frontendUrl}/admin/registration-approved`,
    };
  }

  async rejectRegristration(token: string, reason?: string) {
    const user = await this.usersService.findBYRegistrationToken(token);

    if (!user) {
      throw new BadRequestException('Invalid registration token');
    }

    if (user.registrationStatus !== RegistrationStatus.PENDING) {
      throw new BadRequestException('User registration is not pending');
    }

    await this.usersService.update(user.id, {
      registrationStatus: RegistrationStatus.REJECTED,
      registrationToken: null,
      rejectionReason: reason || 'No reason provided',
    });

    this.logger.log(`User registration rejected: ${user.email}. Reason: ${reason || 'No reason provided'}`);

    return {
      message: `Registration for ${user.email} has been rejected`,
      redirectUrl: `${this.frontendUrl}/admin/registration-rejected`,
    }
  }

  async getPendingRegistrations() {
    return this.usersService.findByStatus(RegistrationStatus.PENDING);
  }

  async getCurrentUser(userId: number): Promise<MeResponse> {
    const user = await this.usersService.findOne(userId);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      registrationStatus: user.registrationStatus,
      isActive: user.isActive,
      lasLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}
