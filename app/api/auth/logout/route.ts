import { NextResponse } from 'next/server';
import { createSessionClient } from '@/utils/appwrite-server';
import { cookies } from 'next/headers';

// POST /api/auth/logout
// Deletes the current session and clears the cookie
export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('appwrite-session')?.value;

    if (sessionToken) {
      const { account } = createSessionClient(sessionToken);
      await account.deleteSession('current');
    }

    const response = NextResponse.json({ success: true, message: 'Logged out' });
    response.cookies.set('appwrite-session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error: any) {
    // Even if session deletion fails, clear the cookie
    const response = NextResponse.json({ success: true, message: 'Logged out' });
    response.cookies.set('appwrite-session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });
    return response;
  }
}
