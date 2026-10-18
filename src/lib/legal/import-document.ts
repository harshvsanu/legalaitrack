import type { DocumentKind } from "./types";

export interface ExtractedDocument {
  kind: DocumentKind;
  text: string;
  pages: string[];
}

const MAX_FILE_BYTES = 25 * 1024 * 1024;

export async function extractLocalFile(file: File): Promise<ExtractedDocument> {
  if (file.size === 0) throw new Error("This file is empty.");
  if (file.size > MAX_FILE_BYTES) throw new Error("Choose a file smaller than 25 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "txt") {
    const text = (await file.text()).trim();
    if (!text) throw new Error("No readable text was found in this file.");
    return { kind: "txt", text, pages: [text] };
  }
  if (extension === "pdf") {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => "str" in item ? item.str : "").filter(Boolean).join(" ").trim();
      pages.push(pageText);
    }
    const text = pages.map((page, index) => `Page ${index + 1}\n${page}`).join("\n\n").trim();
    if (!pages.some((page) => page.length > 0)) throw new Error("This PDF has no selectable text. Scanned-document OCR is not available yet; try a text-based PDF or paste the text into a .txt file.");
    return { kind: "pdf", text, pages };
  }
  if (extension === "docx") {
    const mammoth = await import("mammoth/mammoth.browser");
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    const text = result.value.trim();
    if (!text) throw new Error("No readable text was found in this Word document.");
    return { kind: "docx", text, pages: [text] };
  }
  throw new Error("Choose a PDF, Word document (.docx), or plain text file (.txt).");
}