const express = require("express")
const http = require("http")
const socketIo = require("socket.io")
const path = require("path")

const app = express()
const server = http.createServer(app)
const io = socketIo(server)

// Serve static files
app.use(express.static(path.join(__dirname, "public")))
app.use(express.json())

// Store connected users
const users = {}
const adminSocketId = null

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("New user connected:", socket.id)

  // Handle user login
  socket.on("login", (userData) => {
    const { name, isAdmin } = userData

    // Store user information
    users[socket.id] = { name, isAdmin }

    // Notify user of successful login
    socket.emit("login-success", { id: socket.id, name, isAdmin })

    // Notify others that a new user has joined
    if (!isAdmin) {
      socket.broadcast.emit("user-joined", { id: socket.id, name })
    } else {
      // If admin, send list of all connected clients
      const clients = Object.keys(users)
        .filter((id) => !users[id].isAdmin)
        .map((id) => ({ id, name: users[id].name }))
      socket.emit("client-list", clients)
    }
  })

  // Handle chat messages
  socket.on("send-message", (data) => {
    const { to, message } = data
    const from = socket.id
    const sender = users[from]

    if (!sender) return

    // Direct message to specific user
    if (to) {
      io.to(to).emit("new-message", {
        from: from,
        name: sender.name,
        message,
        isAdmin: sender.isAdmin,
      })

      // Also send the message back to the sender if not admin
      if (from !== to) {
        socket.emit("new-message", {
          from: from,
          to: to,
          name: sender.name,
          message,
          isAdmin: sender.isAdmin,
        })
      }
    }
    // Broadcast to all if no specific recipient
    else {
      io.emit("new-message", {
        from: from,
        name: sender.name,
        message,
        isAdmin: sender.isAdmin,
      })
    }
  })

  // Handle disconnection
  socket.on("disconnect", () => {
    const user = users[socket.id]
    if (user) {
      console.log(`User disconnected: ${user.name}`)

      // Notify others that user has left
      socket.broadcast.emit("user-left", { id: socket.id, name: user.name })

      // Remove user from users object
      delete users[socket.id]
    }
  })
})

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})

app.get("/chat", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "chat.html"))
})

// Start server
const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

