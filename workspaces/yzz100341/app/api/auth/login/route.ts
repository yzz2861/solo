import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signToken, COOKIE_NAME, SessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let email: string;
    let password: string;
    let redirectTo: string | null = null;

    if (contentType.includes('application/json')) {
      const body = await req.json();
      email = body.email;
      password = body.password;
      redirectTo = body.redirect || null;
    } else {
      const formData = await req.formData();
      email = String(formData.get('email') || '');
      password = String(formData.get('password') || '');
      redirectTo = String(formData.get('redirect') || '') || null;
    }

    if (!email || !password) {
      if (contentType.includes('application/json')) {
        return NextResponse.json({ error: '邮箱和密码不能为空' }, { status: 400 });
      }
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', '邮箱和密码不能为空');
      return NextResponse.redirect(url);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      if (contentType.includes('application/json')) {
        return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
      }
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', '邮箱或密码错误');
      if (redirectTo) url.searchParams.set('redirect', redirectTo);
      return NextResponse.redirect(url);
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      if (contentType.includes('application/json')) {
        return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
      }
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', '邮箱或密码错误');
      if (redirectTo) url.searchParams.set('redirect', redirectTo);
      return NextResponse.redirect(url);
    }

    const sessionUser: SessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as SessionUser['role'],
      classId: user.classId,
      routeId: user.routeId,
    };

    const token = signToken(sessionUser);

    if (contentType.includes('application/json')) {
      const res = NextResponse.json({ user: sessionUser, redirect: redirectTo || '/' });
      res.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
      return res;
    }

    const url = req.nextUrl.clone();
    url.pathname = redirectTo || '/';
    url.search = '';
    const res = NextResponse.redirect(url, { status: 303 });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
