// protect app client routes - redirect logged-out users to /login

export default defineNuxtRouteMiddleware((to) => {
  if (to.meta.public) return

  const { loggedIn } = useUserSession()

  // redirect the user to the login screen if they're not authenticated
  if (!loggedIn.value) {
    return navigateTo({
      path: '/login',
      // Remember where they were headed, so login can send them back there.
      // query: to.fullPath === '/' ? undefined : { redirect: to.fullPath },
    })
  }
})
