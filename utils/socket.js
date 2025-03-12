import { Server } from "socket.io"
import NodeCache from "node-cache"

import { db } from "./db.js"
import { cronTask } from "../services/cronService.js"

const myCache = new NodeCache()
const usersMap = new Map()
const cachedUsers = new Map()
let io

export const initSocket = (server) => {
  io = new Server(server, {
    maxHttpBufferSize: 1e8,
    cors: {
      origin: "*", // change this to the production URL
    },
  })

  // Initialize users in memory
  // Load all users from DB at startup
  const loadUsersToCache = async () => {
    const promiseConnection = await db.promise().getConnection()
    try {
      const [usersData] = await promiseConnection.query("SELECT * FROM users")
      usersData.forEach((user) => {
        delete user.password
        cachedUsers.set(user.email, { ...user, online: false })
      })
    } finally {
      promiseConnection.release()
    }
  }

  loadUsersToCache()

  io.cachedUsers = cachedUsers

  // Middleware to authenticate users
  io.use((socket, next) => {
    const username = socket.handshake.auth.username
    const userType = socket.handshake.auth.userType
    if (!username || !userType) {
      return next(new Error("Invalid username or userType"))
    }

    socket.username = username
    socket.userType = userType
    next()
  })

  // Function to emit users only when needed
  const emitUpdatedUsers = () => {
    const users = Array.from(cachedUsers.values())
    users.sort((a, b) => b.online - a.online)
    io.emit("users", users)
  }

  const pendingnotifications = async (to, newUser) => {
    // Store the notification in the database
    const promiseConnection = await db.promise().getConnection()

    try {
      const [result] = await promiseConnection.query(
        "INSERT INTO pendingnotifications (sendTo, subject, template, variables) VALUES (?, ?, ?, ?)",
        [
          to,
          "New notification",
          "newAdminNotification",
          JSON.stringify(newUser.user),
        ]
      )

      if (result.affectedRows === 1) {
        if (!myCache.get("cronServiceRunning")) {
          myCache.set("cronServiceRunning", true)
          cronTask(myCache)
        }
      }
    } catch (error) {
      console.error("Error storing notification in the database:", error)
    } finally {
      promiseConnection.release()
    }
  }

  // Connection event
  // This event is triggered whenever a user connects to the server
  io.on("connection", (socket) => {
    usersMap.set(socket.username, socket.id)
    myCache.set(socket.username, true)

    // Update user status
    const user = cachedUsers.get(socket.username)
    if (user) {
      user.online = true
    } else {
      // New user not present in the cache (unlikely but safe)
      cachedUsers.set(socket.username, { email: socket.username, online: true })
    }

    emitUpdatedUsers()

    // Message handling
    socket.on("chat", (to, msg) => {
      const recipientId = usersMap.get(to)

      io.to(recipientId)
        .to(socket.id)
        .emit("chat", { from: socket.username, to, msg })
    })

    socket.on("refresh", emitUpdatedUsers)

    // Notification handling
    socket.on("notification", async (to, msg, newUser) => {
      const onlineStatus = myCache.get(to)

      if (onlineStatus) {
        const recipientId = usersMap.get(to)

        io.to(recipientId).emit("notification", { from: socket.username, msg })
      } else {
        pendingnotifications(to, newUser)
      }
    })

    // Cleanup on disconnect
    socket.on("disconnect", () => {
      myCache.set(socket.username, false)

      const user = cachedUsers.get(socket.username)
      if (user) {
        user.online = false
      }

      emitUpdatedUsers()
    })
  })
}

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized")
  }

  return io
}
