// Require
const express = require("express")
const Router = express.Router()

// Constants/Vars
const lengthFormats = {
    "bytes": 1,
    "kb": 1024,
    "mb": 1048576,
    "gb": 1073741824
}

// Middleware
const head = async (req, res, next) => {
    // Necessary queries: length (limit = 5 GB)
    // Optional queries: unit
    // Optional headers: range
    try {
        const queries = req.query
        const headers = req.headers

        // Necessary queries
        const { length } = queries
        // Optional queries
        const unit = queries["unit"] ?? "bytes"
        // Optional headers
        const range = headers["range"] ?? null

        // Evaluate inputs
        if (!lengthFormats[unit])
            return res.status(400).send("Invalid unit specified")
        var length_num = parseInt(length) * parseInt(lengthFormats[unit])
        if (range) {
            const type = range.split("=")[0].trim() ?? "bytes"
            var range_start = parseInt(range.split('=')[1].split('-')[0].trim() ?? "0")
            var range_end = parseInt(range.split('=')[1].split('-')[1].trim() ?? length)
            switch (type) {
                case "bytes": {
                    range_start *= parseInt(lengthFormats["bytes"])
                    range_end *= parseInt(lengthFormats["bytes"])
                    break
                }
                case "kilobytes": {
                    range_start *= parseInt(lengthFormats["kb"])
                    range_end *= parseInt(lengthFormats["kb"])
                    break
                }
                case "megabytes": {
                    range_start *= parseInt(lengthFormats["mb"])
                    range_end *= parseInt(lengthFormats["mb"])
                    break
                }
                case "gigabytes": {
                    range_start *= parseInt(lengthFormats["gb"])
                    range_end *= parseInt(lengthFormats["gb"])
                    break
                }
            }

            if (range_start < 0 || range_end < range_start || range_start >= length_num)
                return res.status(400).send("Invalid range specified")
            if (range_end > length_num)
                range_end = length_num

            length_num = range_end - range_start + 1

            res.setHeader('content-range', `${type} 0-${range_start}/${range_end}`)
        } else {
            var lf
            switch (unit) {
                case "bytes":
                    lf = "bytes"
                    break
                case "kb":
                    lf = "kilobytes"
                    break
                case "mb":
                    lf = "megabytes"
                    break
                case "gb":
                    lf = "gigabytes"
                    break
            }
            res.setHeader('content-range', `${lf} 0-${length}/${length}`)
        }

        if (length_num > 5 * parseInt(lengthFormats["gb"]))
            return res.status(400).send("Length cannot exceed 5 gigabytes")

        res.setHeader('accept-ranges', 'bytes')
        res.setHeader('content-length', length_num)

        // Modify data
        req.query["length"] = length_num
        req.query["unit"] = "bytes"

        next()
    } catch (e) {
        return res.status(400).send("Required queries not specified")
    }
}
Router.head("/download", head)
Router.get("/download", head, async (req, res, next) => {
    // Necessary queries: length (limit = 1 GB)
    // Optional queries : unit
    try {
        const queries = req.query

        // Necessary queries
        const { length } = queries
        // Optional queries
        const unit = queries["unit"] ?? "bytes"

        // Evaluate inputs
        var length_num = parseInt(length) * parseInt(lengthFormats[unit])

        // Max array size is sample_length bytes
        // Keep sending sample_length bytes SAME array (to avoid memory full)
        const sample_length = 10 * parseInt(lengthFormats["mb"])
        const sample_data = Buffer.from(Array(sample_length))
        while (length_num > 0) {
            // Check if length_num is less than sample_length
            if (length_num < sample_length)
                res.status(200).write(Buffer.from(Array(length_num)), 'binary')
            else
                res.status(206).write(sample_data, 'binary')

            length_num -= sample_length
        }

        return res.end()
    } catch (e) {
        return res.status(400).send("Required queries not specified")
    }
})
Router.get("/download/:info", async (req, res, next) => {
    // Necessary URL Params : info
    try {
        const params = req.params

        // Necessary URL Params
        const { info } = params

        //Evaluate inputs
        const regx = new RegExp(/^(\d+)((bytes|kb|mb|gb){1})$/)
        if (!regx.test(info))
            return res.status(400).send("Invalid parameters")
        const data = regx.exec(info)
        const length = parseInt(data[1])
        const unit = data[2]
        if (length <= 0)
            return res.status(400).send("Binary size can only be positive value")

        return res.redirect(`/download?length=${length}&unit=${unit}`)
    } catch (e) {
        return res.status(400).send("Required params not specified")
    }
})

module.exports = Router