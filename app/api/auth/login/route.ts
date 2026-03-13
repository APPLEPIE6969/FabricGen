import { NextResponse } from 'next/server';
import { users } from '@/utils/appwrite-server';
import { Client, Account } from 'node-appwrite';

// POST /api/auth/login
// Body: { email, password }
// Creates an email/password session and returns it
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Create a session using the Appwrite Account API
    // We need a client-scope session, so we use the Account service directly
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT?.replace(/\/+$/, '') || 'https://fra.cloud.appwrite.io/v1')
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '69af5ae2000dfd855871');

    const account = new Account(client);

    const session = await account.createEmailPasswordSession(email, password);

    // Set session as httpOnly cookie for security
    const response = NextResponse.json({
      success: true,
      userId: session.userId,
      sessionId: session.$id,
    });

    response.cookies.set('appwrite-session', session.secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return response;
  } catch (error: any) {
    const message = error.code === 401
      ? 'Invalid email or password'
      : error.message || 'Login failed';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
