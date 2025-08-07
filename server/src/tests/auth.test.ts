
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type LoginInput } from '../schema';
import { loginUser, createUser, initializeDefaultAdmin } from '../handlers/auth';
import { eq } from 'drizzle-orm';

const testUser: CreateUserInput = {
  username: 'testuser',
  password: 'password123',
  role: 'KASIR',
  full_name: 'Test User'
};

const testAdmin: CreateUserInput = {
  username: 'testadmin',
  password: 'admin123',
  role: 'ADMIN',
  full_name: 'Test Administrator'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a new user', async () => {
    const result = await createUser(testUser);

    expect(result.username).toEqual('testuser');
    expect(result.password).toEqual('password123');
    expect(result.role).toEqual('KASIR');
    expect(result.full_name).toEqual('Test User');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testUser);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('testuser');
    expect(users[0].role).toEqual('KASIR');
    expect(users[0].is_active).toBe(true);
  });

  it('should reject duplicate usernames', async () => {
    await createUser(testUser);

    await expect(createUser(testUser)).rejects.toThrow(/username already exists/i);
  });
});

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate valid user', async () => {
    // Create test user first
    await createUser(testUser);

    const loginInput: LoginInput = {
      username: 'testuser',
      password: 'password123'
    };

    const result = await loginUser(loginInput);

    expect(result.user.username).toEqual('testuser');
    expect(result.user.role).toEqual('KASIR');
    expect(result.user.full_name).toEqual('Test User');
    expect(result.user.is_active).toBe(true);
    expect(result.user).not.toHaveProperty('password');
    expect(result.token).toMatch(/^jwt-\d+-\d+$/);
  });

  it('should reject invalid username', async () => {
    const loginInput: LoginInput = {
      username: 'nonexistent',
      password: 'password123'
    };

    await expect(loginUser(loginInput)).rejects.toThrow(/invalid username or password/i);
  });

  it('should reject invalid password', async () => {
    await createUser(testUser);

    const loginInput: LoginInput = {
      username: 'testuser',
      password: 'wrongpassword'
    };

    await expect(loginUser(loginInput)).rejects.toThrow(/invalid username or password/i);
  });

  it('should reject inactive user', async () => {
    // Create user then deactivate
    const user = await createUser(testUser);
    await db.update(usersTable)
      .set({ is_active: false })
      .where(eq(usersTable.id, user.id))
      .execute();

    const loginInput: LoginInput = {
      username: 'testuser',
      password: 'password123'
    };

    await expect(loginUser(loginInput)).rejects.toThrow(/user account is inactive/i);
  });
});

describe('initializeDefaultAdmin', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create default admin user when none exists', async () => {
    const result = await initializeDefaultAdmin();

    expect(result).toBeDefined();
    expect(result!.username).toEqual('admin');
    expect(result!.password).toEqual('admin123');
    expect(result!.role).toEqual('ADMIN');
    expect(result!.full_name).toEqual('System Administrator');
    expect(result!.is_active).toBe(true);
  });

  it('should save admin to database', async () => {
    const result = await initializeDefaultAdmin();

    const admins = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, 'admin'))
      .execute();

    expect(admins).toHaveLength(1);
    expect(admins[0].role).toEqual('ADMIN');
    expect(admins[0].username).toEqual('admin');
  });

  it('should return null when admin already exists', async () => {
    // Create admin first
    await initializeDefaultAdmin();

    // Try to create again
    const result = await initializeDefaultAdmin();

    expect(result).toBeNull();
  });

  it('should not create duplicate admin users', async () => {
    await initializeDefaultAdmin();
    await initializeDefaultAdmin();

    const admins = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, 'admin'))
      .execute();

    expect(admins).toHaveLength(1);
  });
});
