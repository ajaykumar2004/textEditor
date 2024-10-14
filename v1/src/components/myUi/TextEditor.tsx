import { useCallback, useEffect, useState } from "react";
import "quill/dist/quill.snow.css";
import { io, Socket } from "socket.io-client";
import { redirect, useParams } from "next/navigation"; // Use useParams for route parameters
import Quill from "quill";
import { Delta } from "quill/core";
import { Navbar } from "./Navbar";
import { toast } from "sonner";
// import { saveAs } from 'file-saver';
// import { generate } from 'html-docx-js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const SAVE_INTERVAL_MS = 2000;
const SAVE_VERSION_MS = 60000;
const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["bold", "italic", "underline"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ align: [] }],
  ["image", "blockquote", "code-block"],
  ["clean"],
];

export default function TextEditor() {
  const { id: documentId } = useParams(); // Get the documentId from the route parameters
  const [docName, setDocName] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [quill, setQuill] = useState<Quill | null>(null);
  const server = process.env.NEXT_PUBLIC_SERVER_2;

  // Fetch document metadata
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${server}/document-meta`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId }),
        });
        const result = await res.json();
        if (!res.ok) {
          toast.error(result.error);
          redirect("/");
          return;
        }
        setDocName(result.document_name);
      } catch (err) {
        console.log(err);
      }
    };
    fetchData();
  }, [documentId, server]);

  // Initialize Socket.IO and Quill
  useEffect(() => {
    const s: Socket = io("http://localhost:3001");
    setSocket(s);
    return () => s.disconnect();
  }, []);

  useEffect(() => {
    if (!socket || !quill || !documentId) return;

    socket.once("load-document", (document: Delta) => {
      quill.setContents(document);
      quill.enable();
    });

    socket.emit("get-document", documentId);
  }, [socket, quill, documentId]);

  // Update document contents every 2 seconds
  useEffect(() => {
    if (!socket || !quill) return;

    const interval = setInterval(() => {
      const contents = quill.getContents();
      socket.emit("save-document", contents);
    }, SAVE_INTERVAL_MS);

    // Save current document version every 60 seconds
    const versionInterval = setInterval(() => {
      const contents = quill.getContents();
      socket.emit("save-version-document", contents);
    }, SAVE_VERSION_MS);

    return () => {
      clearInterval(interval);
      clearInterval(versionInterval);
    };
  }, [socket, quill]);

  // Receive changes from other clients
  useEffect(() => {
    if (!socket || !quill) return;

    const handler = (delta: Delta) => {
      quill.updateContents(delta);
    };
    socket.on("receive-changes", handler);

    return () => {
      socket.off("receive-changes", handler);
    };
  }, [socket, quill]);

  // Emit changes to other clients
  useEffect(() => {
    if (!socket || !quill) return;

    const handler = (delta: Delta, oldDelta: Delta, source: string) => {
      if (source !== "user") return;
      socket.emit("send-changes", delta);
    };
    quill.on("text-change", handler);

    return () => {
      quill.off("text-change", handler);
    };
  }, [socket, quill]);

  // Initialize Quill editor
  const wrapperRef = useCallback((wrapper: HTMLDivElement | null) => {
    if (wrapper == null) return;

    wrapper.innerHTML = "";
    const editor = document.createElement("div");
    wrapper.append(editor);
    const q = new Quill(editor, {
      theme: "snow",
      modules: { toolbar: TOOLBAR_OPTIONS },
    });
    q.disable();
    q.setText("Loading...");
    setQuill(q);
  }, []);

  // Export functions
  const exportToDoc = () => {
    const quillContent = quill?.root.innerHTML; // Get Quill's HTML content
    const docx = generate(quillContent); // Convert HTML to docx
    const blob = new Blob([docx], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    saveAs(blob, `${docName}.docx`); // Use docName as filename
  };

  const exportToPDF = () => {
    const quillElement = document.querySelector('.ql-editor'); // Quill's editable area
    html2canvas(quillElement).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(imgData, 'PNG', 0, 0);
      pdf.save(`${docName}.pdf`); // Use docName as filename
    });
  };

  return (
    <div className="w-full">
      <Navbar docname={docName} />
      <div className="flex justify-between my-4">
        <button onClick={exportToDoc} className="btn">
          Export to DOC
        </button>
        <button onClick={exportToPDF} className="btn">
          Export to PDF
        </button>
      </div>
      <div className="w-full" ref={wrapperRef}></div>
    </div>
  );
}
