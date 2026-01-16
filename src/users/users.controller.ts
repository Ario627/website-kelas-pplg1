import { UserRole } from "./entities/user.entities";
import { Roles } from "src/common/decorators/roles.decorators";
import { RolesGuard } from "src/common/guards/role.guard";
import { UsersService } from "./entities/users.service";
import { Body, Controller, Get, Post, Put, Delete, Param, UseGuards, Patch } from "@nestjs/common";

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(
    private usersService: UsersService
  ) { }

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateUserDto: Partial<{ name: string; email: string; password: string; role: UserRole; isActive: boolean; }>) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
