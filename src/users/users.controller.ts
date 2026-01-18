import { UserRole } from "./entities/user.entities";
import { Roles } from "src/common/decorators/roles.decorators";
import { RolesGuard } from "src/common/guards/role.guard";
import { UsersService } from "./entities/users.service";
import { Body, Controller, Get, Delete, Param, UseGuards, Patch, ParseIntPipe } from "@nestjs/common";

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService
  ) { }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.usersService.findAll()
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id)
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: Partial<any>) {
    return this.usersService.update(id, updateUserDto)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id)
  }
}
