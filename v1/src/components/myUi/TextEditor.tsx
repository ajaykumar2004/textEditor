import { useCallback, useEffect, useState } from "react";
import "quill/dist/quill.snow.css";
import { io, Socket } from "socket.io-client";
import { redirect, useParams } from "next/navigation"; // Use useParams for route parameters
import Quill from "quill";
import { Delta } from "quill/core";
import { Navbar } from "./Navbar";
import {toast} from "sonner";
const SAVE_INTERVAL_MS = 2000;
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = { documentId };
        console.log(data);
        const res = await fetch(`${server}/document-meta`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
        const result = await res.json();
        if (!res.ok) {
          toast.error(result.error);
          redirect("/");
          return;
        }
        setDocName(result.document_name);
        console.log(result);
        console.log(docName);
      } catch (err) {
        console.log(err);
      }
    };
    fetchData();
  }, []);

  // Ensure that Quill and Socket.IO only run on the client side
  useEffect(() => {
    const s: Socket = io("http://localhost:3001");
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket || !quill || !documentId) return;

    socket.once("load-document", (document: Delta) => {
      quill.setContents(document);
      quill.enable();
    });

    socket.emit("get-document", documentId);
  }, [socket, quill, documentId]);

  useEffect(() => {
    if (!socket || !quill) return;

    const interval = setInterval(() => {
      socket.emit("save-document", quill.getContents());
    }, SAVE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [socket, quill]);

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

  return (
    <div className="w-full">
      <Navbar docname={docName} />
      <div className="w-full" ref={wrapperRef}></div>;
    </div>
  );
}
