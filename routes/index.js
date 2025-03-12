import express from "express"
const routes = express.Router()

// controllers
import { userCtrl } from "../controllers/users.js"

// routes
routes.post("/users/add", userCtrl.createUser)
routes.post("/users/sign-in", userCtrl.signIn)

export { routes }
