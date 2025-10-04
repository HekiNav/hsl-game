import express from "express"
import cors from "cors"
import hslGamblingApi from "./hslGamblingApi.js"
import generateDocs from "./modules/docsCreator.js"
import apiDocsJson from "./index.json" with { type: "json" }

import expressWs from "express-ws"

const app = express()

expressWs(app)

const port = 3001
app.use(cors())
app.use("/hsl-gambling", hslGamblingApi())
app.listen(port, () => {
    console.log(`Starting up main app: Listening on port ${port}`)
})
app.get('/', (req, res) => {
    res.send(generateDocs(apiDocsJson))
})
