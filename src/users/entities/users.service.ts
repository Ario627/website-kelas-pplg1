import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User, RegistrationStatus } from "./user.entities";

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepositiry: Repository<User>,
  ) { }

  async create(createUserDto: Partial<User>): Promise<User> {
    const user = this.usersRepositiry.create(createUserDto);
    const savedUser = await this.usersRepositiry.save(user);
    this.logger.log(`User created with ID: ${savedUser.id}`);
    return savedUser;
  }

  async findAll(): Promise<User[]> {
    return this.usersRepositiry.find({
      select: ['id', 'name', 'email', 'role', 'registrationStatus', 'isActive', 'lastLoginAt'],
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepositiry.findOne({ where: { id } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepositiry.findOne({ where: { email } });
  }

  async update(id: number, updateUserDto: Partial<User>): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, updateUserDto);
    return this.usersRepositiry.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.usersRepositiry.findOne({ where: { id } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    await this.usersRepositiry.remove(user);
    this.logger.log(`User with ID: ${id} has been removed`);
  }

  async updateLoginInfo(id: number, ipAddress?: string): Promise<void> {
    await this.usersRepositiry.update(id, {
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress || null,
    });
  }

  async findBYRegistrationToken(token: string): Promise<User | null> {
    return this.usersRepositiry.findOne({ where: { registrationToken: token } });
  }

  async findByStatus(status: RegistrationStatus): Promise<User[]> {
    return this.usersRepositiry.find({
      where: { registrationStatus: status },
      select: ['id', 'name', 'email', 'createdAt', 'registrationToken'],
      order: { createdAt: 'DESC' }
    });
  }

  // Yang baru
  async updateRefreshToken(id: number, refreshToken: string | null): Promise<void> {
    await this.usersRepositiry.update({ id }, { refreshToken });
  }

  async incrementTokenVersion(id: number): Promise<void> {
    await this.usersRepositiry.increment({ id }, 'tokenVersion', 1);
  }

  async findOneWithRefreshToken(id: number): Promise<User | null> {
    return this.usersRepositiry.findOne({
      where: { id },
      select: [
        'id', 'email', 'name', 'role', 'registrationStatus',
        'isActive', 'refreshToken', 'tokenVersion'
      ],
    });
  }

  async countPending(): Promise<number> {
    return this.usersRepositiry.count({
      where: { registrationStatus: RegistrationStatus.PENDING }
    });
  }

  async getPendingUsers(): Promise<User[]> {
    return this.usersRepositiry.find({
      where: { registrationStatus: RegistrationStatus.PENDING },
      select: ['id', 'name', 'email', 'createdAt', 'registrationToken'],
      order: { createdAt: 'DESC' }
    });
  }
}
