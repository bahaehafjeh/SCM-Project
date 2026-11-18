/**
 * Signed-in user shown in the header. The app has no authentication yet, so these values
 * mirror the live build's user card and must come from the session once auth exists.
 */
export const currentUser = {
  name: 'بهاره افجه',
  title: 'ذخایر راهبردی',
}

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    // ZWNJ keeps Persian initials from joining into one glyph
    .join(/[a-z]/i.test(name) ? '' : String.fromCharCode(0x200c))

/**
 * Send signed-out visitors to /login. Off by default so design-review links (e.g. /alerts/ALR-1042)
 * open without signing in; turn on once the authentication service exists.
 */
export const REQUIRE_LOGIN = false
