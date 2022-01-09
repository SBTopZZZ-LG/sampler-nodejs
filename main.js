// Start scripts
const app = require("./scripts/start_express")

// Middleware
app.use(require("./routes/download/download_v1"))