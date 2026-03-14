import { NextResponse } from 'next/server';
import { createSessionClient } from '@/utils/appwrite-server';
import { cookies } from 'next/headers';

// GET /api/auth/session
// Returns the current logged-in user's info, or null if not authenticated
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('appwrite-session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ user: null });
    }

    const { account } = createSessionClient(sessionToken);
    const user = await account.get();

    return NextResponse.json({
      user: {
        id: user.$id,
        email: user.email,
        name: user.name,
        emailVerification: user.emailVerification,
      },
      success: true,
    });
  } catch (error: any) {
    // Session is invalid or expired
    return NextResponse.json({ user: null });
  }
}
