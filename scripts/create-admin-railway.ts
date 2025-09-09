// Run this script to create admin user on Railway
// You can run this via Railway's console or locally pointing to Railway DB

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import { CreateUserDto } from '../src/users/dto/create-user.dto';

async function createAdminUser() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const adminUser: CreateUserDto = {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@xmarket.com',
    password: 'AdminPassword123!',
    universityEmail: 'admin@university.edu',
    universityId: 'ADMIN001',
    isEmailVerified: true,
  };

  try {
    const user = await usersService.create(adminUser);
    console.log('Admin user created successfully:', user.email);
  } catch (error) {
    console.error('Error creating admin user:', error.message);
  }

  await app.close();
}

createAdminUser();
