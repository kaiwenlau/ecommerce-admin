// protect API routes - throw 401 error if the request not from valid user session

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  return { user }
})
