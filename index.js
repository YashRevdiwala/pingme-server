// Import required modules
import compression from "compression"
import cors from "cors"
import { configDotenv } from "dotenv"
import express from "express"
import { createServer } from "http"
configDotenv()

import { routes } from "./routes/index.js"
import { initSocket } from "./utils/socket.js"

// Create an instance of Express
const app = express()
const PORT = process.env.PORT || 3000

// CORS options
const corsOptions = {
  origin: [
    // development origins
    "http://localhost:5173",
    "http://192.168.0.136:5173",
    "http://192.168.0.174:5173",
    // production origins
    "http://localhost:4173",
    "http://192.168.0.136:4173",
    "http://192.168.0.174:4173",
  ],
  credentials: true,
}
app.use(cors(corsOptions))

// Use middleware to parse the request body
app.use(express.json({ limit: "100mb", extended: true }))
app.use(express.urlencoded({ limit: "100mb", extended: true }))

app.use(compression())

const server = createServer(app)

// Initialize socket.io server
initSocket(server)

app.use("/", routes)

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
