import mysql from "mysql2"
import { configDotenv } from "dotenv"
configDotenv()

// Create a MySQL connection pool
const db = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  multipleStatements: true,
})

// Verify the connection
try {
  db.getConnection((err, connection) => {
    if (err) {
      console.log("Error connecting to the database:", err)
      return
    }

    console.log("Database connected successfully")
    connection.release()
  })
} catch (error) {
  console.log("Error connecting to the database:", error)
}

export { db }
