import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import type { SessionUser } from '@/lib/auth';

const ROLE_HOME: Record<SessionUser['role'], string> = {
  PARENT: '/parent',
  TEACHER: '/teacher',
  DRIVER: '/driver',
  CONDUCTOR: '/conductor',
  ADMIN: '/admin',
};

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  redirect(ROLE_HOME[user.role]);
}
