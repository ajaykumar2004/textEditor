const { Schema, model } = require("mongoose");

const DocumentMetaSchema = new Schema({
  document_name: { type: String, required: true }, 
  document_description: { type: String, required: true }, 
  _id: { type: String, required: true }, 
  data: { type: Object }, 
  timestamp: {
    type: Date,
    default: Date.now, 
  },
});

module.exports = model("DocumentMeta", DocumentMetaSchema);
