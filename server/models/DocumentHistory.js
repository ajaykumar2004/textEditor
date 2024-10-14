// for versioning

const {Schema, model} = require("mongoose");

const DocumentHistory = new Schema({
    documentId: String,
    version : Number,
    data : Object,
    timestamp: {
        type: Date,
        default: Date.now, 
    },
});
module.exports = model("DocumentHistory",DocumentHistory);