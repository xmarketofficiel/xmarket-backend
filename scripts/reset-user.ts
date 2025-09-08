import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';

async function resetUser() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const email = process.argv[2];
  
  if (!email) {
    console.error('Please provide an email address');
    console.log('Usage: npm run reset:user -- user@example.com');
    process.exit(1);
  }

  try {
    const user = await usersService.findByEmail(email);
    
    if (!user) {
      console.log(`No user found with email: ${email}`);
      await app.close();
      return;
    }

    console.log(`Found user: ${user.email} (ID: ${user.id}, Verified: ${user.isVerified})`);
    console.log(`Created at: ${user.createdAt}`);
    
    // Remove the user
    await usersService.remove(user.id);
    console.log(`✅ User ${email} has been removed from the database`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }

  await app.close();
}

resetUser();
