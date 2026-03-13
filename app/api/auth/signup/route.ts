import { NextResponse } from 'next/server';
import { users, databases, DB_ID, COLLECTIONS, Query } from '@/utils/appwrite-server';
import { ID, Permission, Role } from 'node-appwrite';

// POST /api/auth/signup
// Body: { email, password, name }
// Creates an Appwrite account + Profile + UserSettings documents
export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // 1. Create user account
    const user = await users.create(ID.unique(), email, undefined, password, name || undefined);

    // 2. Auto-create Profile document
    await databases.createDocument(
      DB_ID,
      COLLECTIONS.PROFILES,
      ID.unique(),
      {
        user_id: user.$id,
        username: name || email.split('@')[0],
        bio: '',
        avatar_url: '',
      },
      [
        Permission.read(Role.user(user.$id)),
        Permission.update(Role.user(user.$id)),
        Permission.delete(Role.user(user.$id)),
      ]
    );

    // 3. Auto-create UserSettings document
    await databases.createDocument(
      DB_ID,
      COLLECTIONS.USER_SETTINGS,
      ID.unique(),
      {
        user_id: user.$id,
        dark_mode: true,
        default_minecraft_version: '1.21.11',
      },
      [
        Permission.read(Role.user(user.$id)),
        Permission.update(Role.user(user.$id)),
        Permission.delete(Role.user(user.$id)),
      ]
    );

    return NextResponse.json({
      success: true,
      userId: user.$id,
      message: 'Account created successfully',
    });
  } catch (error: any) {
    const status = error.code === 409 ? 409 : 500;
    const message = error.code === 409
      ? 'An account with this email already exists'
      : error.message || 'Failed to create account';
    return NextResponse.json({ error: message }, { status });
  }
}
