// Require
const express = require("express")
const cors = require("cors")

// Constants/Vars
const PORT = process.env.PORT || 3000
const app = express()

// Middleware
app.use(express.json())
app.use(cors())

app.listen(PORT, () => {
    console.log("Express server started on port", PORT)
})

module.exports = app