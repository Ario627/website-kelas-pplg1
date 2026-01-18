import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { User } from "src/users/entities/user.entities"
import { AdminSeeder } from "./seeders/admin.seeders"

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [AdminSeeder],
})
export class DatabaseModule { }
