// protect app client routes - redirect logged-out users to /login

export default defineNuxtRouteMiddleware((to) => {
  if (to.meta.public) return

  const { loggedIn } = useUserSession()

  // Remember where they were headed, so login can send them back there.
  if (!loggedIn.value) {
    return navigateTo({
      path: '/login',
      query: to.fullPath === '/' ? undefined : { redirect: to.fullPath },
    })
  }
})
