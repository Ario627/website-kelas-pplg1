import { Injectable, OnModuleInit } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { UserRole, User } from "../../users/entities/user.entities";
import { Repository } from 'typeorm';
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class AdminSeeder implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) { }

  async onModuleInit() {
    await this.seedAdmin();
  }

  async seedAdmin() {
    const adminExists = await this.usersRepository.findOne({ where: { role: UserRole.ADMIN } });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);

      const admin = this.usersRepository.create({
        name: 'Administator',
        email: 'admin@kelas.com',
        password: hashedPassword,
        role: UserRole.ADMIN
      });

      await this.usersRepository.save(admin);
      console.log('Admin user created');
    }
  }
}
