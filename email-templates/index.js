import { dirname, resolve } from "path"
import { readFileSync } from "fs"
import { fileURLToPath } from "url"

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const loadTemplate = (templateName, variables) => {
  const templatePath = resolve(__dirname, `${templateName}.html`)
  let template = readFileSync(templatePath, "utf-8")

  variables.year = new Date().getFullYear()

  // Replace placeholders with actual values
  Object.entries(variables).forEach(([key, value]) => {
    template = template.replace(new RegExp(`{{${key}}}`, "g"), value)
  })

  return template
}
