const mongoose = require("mongoose");
const Document = require("./models/Document");
const DocumentMeta = require("./models/DocumentMeta");
const DocumentHistory = require("./models/DocumentHistory");
const express = require("express");
const cors = require("cors");
const app = express();

mongoose.connect("mongodb+srv://ajaykumar30802004:tuL6GqxG0TNB3Leg@cluster.nfqk6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
});


const io = require("socket.io")(3001, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Enable JSON parsing for all routes
const defaultValue = "";

// Set up Socket.IO
io.on("connection", (socket) => {
  socket.on("get-document", async (documentId) => {
    const document = await findOrCreateDocument(documentId);
    socket.join(documentId);
    socket.emit("load-document", document.data);

    socket.on("send-changes", (delta) => {
      socket.broadcast.to(documentId).emit("receive-changes", delta);
    });

    socket.on("save-version-document", async (data) => {
      const currentVersionDocument= await Document.findById(documentId);
      if(currentVersionDocument) {
        const versionCount=await DocumentHistory.countDocuments({documentId});
        await DocumentHistory.create({documentId,
          version : versionCount+1,
          data: currentVersionDocument.data,
        })
      }
    });

    socket.on("save-document", async (data) => {
      // then updating 
      await Document.findByIdAndUpdate(documentId, { data });
    });
  });
});

// Document API route
app.post("/document-meta", async (req, res) => {
  const {documentId}  = req.body;
  // console.log(documentId);
  try {
    const documents = await DocumentMeta.findById(documentId);
    console.log(documents);
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: "Error fetching documents" });
  }
});


app.get("/documents", async (req, res) => {
  try {
    const documents = await DocumentMeta.find().sort({timestamp: -1});
    // console.log(documents);
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: "Error fetching documents" });
  }
});

//check and insert new document

app.post("/documents", async (req, res) => {
  const { docName, docId, docDesc } = req.body;
  console.log(docName, docId, docDesc);

  try {
    if (await findDocumentMeta(docId)) {
      res.status(409).json({error:"Document Id already exists"});
      return;
    }

    const document = await Document.create({ _id: docId, data: defaultValue });
    const documentMeta = await DocumentMeta.create({
      _id: docId,
      document_name: docName,
      document_description: docDesc,
    });

    res.status(201).json("Document created successfully");
    return;
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Something went wrong! try again later." });
  }
});

// Document Version History API:
// all version of document sorted from latest
app.get("/documents/:documentId/versions",async (req, res) => {
  const {documentId} = req.params;
  try{
    const version= await DocumentHistory.find({ documentId }).sort({version:-1});
    res.json(version);
  } catch(error){
    res.status(500).json({
      error: "Error fetching versions",
    })
  }
})
// specific version of document 
app.get("/documents/:documentId/versions/:versionNumber",async (req,res)=>{
  const {documentId , versionNumber} = req.params;
  try{
    const version = await DocumentHistory.findOne({documentId,version : versionNumber});
    if(version){
      res.json(version);
    }
    else{
      res.status(404).json({error: "version not found"});
    }
  } catch(error) {
    res.json(500).json({error: "Error fetching version"});
  }
})

// Rollback to a specific version
app.post("/documents/:documentId/rollback/:versionNumber", async (req, res) => {
  const { documentId, versionNumber } = req.params;

  try {
    const version = await DocumentHistory.findOne({ documentId, version: versionNumber });
    if (version) {
      await Document.findByIdAndUpdate(documentId, { data: version.data });
      res.json({ message: `Rolled back to version ${versionNumber}` });
    } else {
      res.status(404).json({ error: "Version not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error during rollback" });
  }
});

//HELPER FUNCTION TO CHECK IF A DOC-ID IS ALREADY PRESENT
async function findDocumentMeta(id) {
  if (id == null) return;
  const document = await DocumentMeta.findById(id);
  console.log(document);
  if (document!=null) return true;
  else return false;
}

// Helper function to find or create a document [UNUSED]
async function findOrCreateDocument(id) {
  if (id == null) return;

  const document = await Document.findById(id);
  if (document) return document;
  return await Document.create({ _id: id, data: defaultValue });
}

// Start the server
const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
