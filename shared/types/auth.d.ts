// Let TypeScript know what we put in the session
// `user.email` is typed instead of being `any`

declare module '#auth-utils' {
  interface User {
    id: number
    email: string
  }

  interface UserSession {
    loggedInAt?: string
  }
}

// Let a page mark itself reachable without logging in, e.g. /login.
declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
  }
}

export {}
