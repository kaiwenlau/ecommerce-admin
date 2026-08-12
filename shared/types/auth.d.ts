// Tells TypeScript what we put in the session, so `user.email` is typed
// everywhere instead of being `any`.

declare module '#auth-utils' {
  interface User {
    id: number
    email: string
  }

  interface UserSession {
    loggedInAt?: string
  }
}

// Lets a page mark itself reachable without logging in, e.g. /login.
declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
  }
}

export {}
