document.addEventListener("DOMContentLoaded", () => {
  const userDataString = sessionStorage.getItem("chatUser")
  if (!userDataString) {
    window.location.href = "/"
    return
  }

  const userData = JSON.parse(userDataString)
  const { name, isAdmin } = userData

  document.getElementById("user-name").textContent = name
  document.getElementById("user-status").textContent = isAdmin ? "Admin" : "Client"

  const sidebar = document.getElementById("sidebar")
  if (!isAdmin) {
    sidebar.style.display = "none"
  }

  const socket = io()
  let currentChatUser = null

  socket.on("connect", () => {
    console.log("Connected to server")

    socket.emit("login", userData)
  })

  socket.on("login-success", (data) => {
    console.log("Login successful:", data)
  })

  socket.on("client-list", (clients) => {
    const usersList = document.getElementById("users-list")
    usersList.innerHTML = ""

    if (clients.length === 0) {
      usersList.innerHTML = '<div class="no-users">No clients connected</div>'
      return
    }

    clients.forEach((client) => {
      const userItem = document.createElement("div")
      userItem.className = "user-item"
      userItem.dataset.userId = client.id

      userItem.innerHTML = `
        <div class="user-avatar">${client.name.charAt(0).toUpperCase()}</div>
        <div class="user-item-name">${client.name}</div>
      `

      userItem.addEventListener("click", () => {
        document.querySelectorAll(".user-item").forEach((item) => {
          item.classList.remove("active")
        })
        userItem.classList.add("active")
        currentChatUser = client.id
        document.getElementById("chat-title").textContent = `Chat with ${client.name}`
      })

      usersList.appendChild(userItem)
    })
  })

  socket.on("user-joined", (user) => {
    addSystemMessage(`${user.name} has joined the chat`)

    if (isAdmin) {
      const usersList = document.getElementById("users-list")
      const noUsers = usersList.querySelector(".no-users")
      if (noUsers) {
        usersList.innerHTML = ""
      }

      const userItem = document.createElement("div")
      userItem.className = "user-item"
      userItem.dataset.userId = user.id

      userItem.innerHTML = `
        <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
        <div class="user-item-name">${user.name}</div>
      `

      userItem.addEventListener("click", () => {
        document.querySelectorAll(".user-item").forEach((item) => {
          item.classList.remove("active")
        })

        userItem.classList.add("active")
        currentChatUser = user.id
        document.getElementById("chat-title").textContent = `Chat with ${user.name}`
      })

      usersList.appendChild(userItem)
    }
  })

  socket.on("user-left", (user) => {
    addSystemMessage(`${user.name} has left the chat`)
    if (isAdmin) {
      const userItem = document.querySelector(`.user-item[data-user-id="${user.id}"]`)
      if (userItem) {
        userItem.remove()
      }

      const usersList = document.getElementById("users-list")
      if (usersList.children.length === 0) {
        usersList.innerHTML = '<div class="no-users">No clients connected</div>'
      }

      if (currentChatUser === user.id) {
        currentChatUser = null
        document.getElementById("chat-title").textContent = "Chat Room"
      }
    }
  })
  
  socket.on("new-message", (data) => {
    const { from, name, message, isAdmin: senderIsAdmin } = data
    const isOutgoing = from === socket.id
    const messageElement = document.createElement("div")
    messageElement.className = `message ${isOutgoing ? "outgoing" : "incoming"}`

    messageElement.innerHTML = `
      <div class="message-bubble">${message}</div>
      <div class="message-info">
        ${isOutgoing ? "You" : name}
        ${senderIsAdmin ? '<span class="admin-badge">Admin</span>' : ""}
      </div>
    `

    const messagesContainer = document.getElementById("messages-container")
    messagesContainer.appendChild(messageElement)
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  })

  const messageForm = document.getElementById("message-form")
  const messageInput = document.getElementById("message-input")

  messageForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const message = messageInput.value.trim()
    if (!message) return

    socket.emit("send-message", {
      to: isAdmin ? currentChatUser : null, 
      message,
    })

    messageInput.value = ""
  })

  document.getElementById("logout-btn").addEventListener("click", () => {
    sessionStorage.removeItem("chatUser")
    window.location.href = "/"
  })

  function addSystemMessage(message) {
    const systemMessage = document.createElement("div")
    systemMessage.className = "system-message"
    systemMessage.textContent = message

    const messagesContainer = document.getElementById("messages-container")
    messagesContainer.appendChild(systemMessage)
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  }
})

