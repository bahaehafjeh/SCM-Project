/**
 * TEMPORARY sign-in session, kept in sessionStorage until the authentication service exists.
 * Replace with the real service (token, expiry, refresh) once it is available; callers only use
 * these three functions.
 */
const KEY = 'scm-session'

export function signIn(email: string) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ email, at: new Date().toISOString() }))
  } catch {
    /* storage blocked: the session lasts for this page only */
  }
}

export function signOut() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* nothing stored */
  }
}

export function isSignedIn(): boolean {
  try {
    return sessionStorage.getItem(KEY) !== null
  } catch {
    return false
  }
}

/** Where to go after sign-in: `next` only when it is an in-app path other than the login page */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/'
  const path = next.split(/[?#]/)[0]
  return path === '/login' ? '/' : next
}
