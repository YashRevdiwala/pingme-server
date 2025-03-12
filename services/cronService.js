import { schedule } from "node-cron"

import { db } from "../utils/db.js"
import { sendEmail } from "./emailService.js"

export const cronTask = async (myCache) => {
  const promiseConnection = await db.promise().getConnection()

  try {
    const [result] = await promiseConnection.query(
      "SELECT * FROM pendingnotifications WHERE status = 'PENDING'"
    )

    if (result.length > 0) {
      result.forEach(async (notification) => {
        //   Send the notification email asynchronously
        await sendEmail({
          to: notification.sendTo,
          subject: notification.subject,
          template: notification.template,
          variables: notification.variables,
        })

        // Start a transaction
        await promiseConnection.query("START TRANSACTION")

        // Update the notification status
        const [updateResults] = await promiseConnection.query(
          "UPDATE pendingnotifications SET status = 'SENT' WHERE id = ?",
          [notification.id]
        )

        if (updateResults.affectedRows === 1) {
          await promiseConnection.query("COMMIT")
        } else {
          console.log("Error updating notification status")
          await promiseConnection.query("ROLLBACK")
        }
      })

      myCache.set("cronServiceRunning", false)
    }
  } catch (error) {
    console.log("Error fetching notifications:", error)
  } finally {
    promiseConnection.release()
  }
}
