const { Schema, model } = require("mongoose")

const Document = new Schema({
  _id: String,
  data: Object,
  timestamp: {
    type: Date,
    default: Date.now, 
  },
})

module.exports = model("Document", Document)


