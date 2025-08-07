
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type LoginResponse, type CreateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function loginUser(input: LoginInput): Promise<LoginResponse> {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid username or password');
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('User account is inactive');
    }

    // Verify password (simple comparison for now - in production use bcrypt)
    if (user.password !== input.password) {
      throw new Error('Invalid username or password');
    }

    // Generate simple JWT token (in production use proper JWT library)
    const token = `jwt-${user.id}-${Date.now()}`;

    // Return user without password
    const { password, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword,
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    // Check if username already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (existingUsers.length > 0) {
      throw new Error('Username already exists');
    }

    // Create new user
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        password: input.password, // In production, hash this password
        role: input.role,
        full_name: input.full_name
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}

export async function initializeDefaultAdmin(): Promise<User | null> {
  try {
    // Check if admin user already exists
    const adminUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, 'admin'))
      .execute();

    if (adminUsers.length > 0) {
      return null; // Admin already exists
    }

    // Create default admin user
    const result = await db.insert(usersTable)
      .values({
        username: 'admin',
        password: 'admin123', // Default password - should be changed in production
        role: 'ADMIN',
        full_name: 'System Administrator'
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Admin initialization failed:', error);
    throw error;
  }
}
