import { db } from "../utils/db.js"
import { getIO } from "../utils/socket.js"

const userCtrl = {}

userCtrl.createUser = async (req, res) => {
  let promiseConnection

  try {
    promiseConnection = await db.promise().getConnection()

    const { name, email, password, userType } = req.body

    const [results] = await promiseConnection.query(
      "INSERT INTO users (name, email, password, userType) VALUES (?, ?, ?, ?)",
      [name, email, password, userType]
    )

    // Update cache immediately after adding the new user
    const io = getIO()
    const cachedUsers = io.cachedUsers || new Map()

    const newUser = {
      id: results.insertId, // Assuming MySQL returns the insert ID
      name,
      email,
      userType,
      online: false,
    }

    cachedUsers.set(email, newUser)

    // Notify all connected clients about the new user
    io.emit("users", Array.from(cachedUsers.values()))

    return res
      .status(201)
      .json({
        flag: 1,
        message: "User Created Successfully",
        results,
        user: newUser,
      })
  } catch (error) {
    return res.status(400).json({ flag: 0, message: error.message })
  } finally {
    if (promiseConnection) promiseConnection.release()
  }
}

userCtrl.signIn = async (req, res) => {
  let promiseConnection

  try {
    promiseConnection = await db.promise().getConnection()
    const { email, password } = req.body

    const [user] = await promiseConnection.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    )

    if (user.length === 0) {
      return res.status(404).json({ flag: 0, message: "Invalid credentials" })
    } else {
      if (user[0].password !== password) {
        return res.status(401).json({ flag: 0, message: "Invalid credentials" })
      }

      delete user.password
      return res
        .status(200)
        .json({
          flag: 1,
          message: "User Logged In Successfully",
          user: user[0],
        })
    }
  } catch (error) {
    return res.status(400).json({ flag: 0, message: error.message })
  } finally {
    if (promiseConnection) promiseConnection.release()
  }
}

export { userCtrl }
