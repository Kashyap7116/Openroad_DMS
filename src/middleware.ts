import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('Middleware: Missing Supabase environment variables, passing through')
    return NextResponse.next()
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // Refresh session if expired - required for Server Components
  await supabase.auth.getUser()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protected routes
  const protectedPaths = ['/dashboard', '/admin', '/hr', '/finance', '/purchase', '/sales', '/maintenance', '/reports', '/alerts', '/settings']
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

  // If accessing protected route without session, redirect to login
  if (isProtectedPath && !session) {
    console.log('Middleware: Redirecting to login - no session for protected route')
    return NextResponse.redirect(new URL('/', request.url))
  }

  // If logged in and trying to access login page, redirect to dashboard
  if (request.nextUrl.pathname === '/' && session) {
    console.log('Middleware: Redirecting to dashboard - already authenticated')
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     * - uploads (upload directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|api|uploads).*)',
  ],
}