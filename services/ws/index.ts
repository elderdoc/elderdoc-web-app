const PORT = parseInt(process.env.PORT ?? '8080')

Bun.serve({
  port: PORT,
  fetch(req, server) {
    if (server.upgrade(req)) return
    return new Response('ElderDoc WS Service', { status: 200 })
  },
  websocket: {
    open(ws) {
      console.log('[ws] client connected')
    },
    message(ws, message) {
      console.log('[ws] message received:', message)
    },
    close(ws) {
      console.log('[ws] client disconnected')
    },
  },
})

console.log(`[ws] Listening on port ${PORT}`)
