import { createFileRoute, Link } from "@tanstack/react-router";
import { FileCheck2, FileSearch, FileText, LockKeyhole, Plus, Search, ShieldCheck, Sparkles, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extractFindings, extractKeyTerms, makeChecklist } from "@/lib/legal/analysis";
import { extractLocalFile } from "@/lib/legal/import-document";
import { listDocuments, saveDocument } from "@/lib/legal/storage";
import type { ReviewDocument } from "@/lib/legal/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LegalEase AI — Understand agreements, locally" },
      { name: "description", content: "Review contract language, key dates, and clauses in your browser. Your document stays on your device." },
      { property: "og:title", content: "LegalEase AI — Private document review" },
      { property: "og:description", content: "Understand agreements in plain language with document evidence, right in your browser." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const categories = [
  { name: "Rental agreement", Icon: FileText, description: "Lease terms & deposits" },
  { name: "Employment contract", Icon: FileCheck2, description: "Roles & work terms" },
  { name: "Service agreement", Icon: FileSearch, description: "Scope & payments" },
];

function Dashboard() {
  const [documents, setDocuments] = useState<ReviewDocument[]>([]);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All documents");
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    try { setDocuments(await listDocuments()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Local storage could not be opened."); }
  };

  useEffect(() => { void refresh(); }, []);

  const visibleDocuments = useMemo(() => documents.filter((document) => {
    const matchesQuery = document.name.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = selectedCategory === "All documents" || document.category === selectedCategory;
    return matchesQuery && matchesCategory;
  }), [documents, query, selectedCategory]);

  async function importFiles(files: FileList | File[]) {
    setError("");
    setIsImporting(true);
    try {
      const file = Array.from(files)[0];
      if (!file) return;
      const extracted = await extractLocalFile(file);
      const now = Date.now();
      const record: ReviewDocument = {
        id: crypto.randomUUID(), name: file.name, kind: extracted.kind,
        category: detectCategory(extracted.text), createdAt: now, updatedAt: now, size: file.size,
        text: extracted.text, pages: extracted.pages, terms: extractKeyTerms(extracted.text),
        findings: extractFindings(extracted.text), checklist: makeChecklist(),
      };
      await saveDocument(record);
      await refresh();
      window.location.href = `/documents/${record.id}`;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This file could not be read. Your original file has not been uploaded.");
    } finally { setIsImporting(false); }
  }

  const totalAttention = documents.reduce((count, document) => count + document.findings.filter((finding) => finding.level !== "informational").length, 0);
  const reviewed = documents.length;

  return (
    <div className="min-h-screen bg-legal-canvas text-foreground">
      <header className="sticky top-0 z-30 border-b border-legal-line bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5 font-semibold text-legal-navy" aria-label="LegalEase AI home">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><FileCheck2 className="size-5" /></span>
            <span className="text-[17px]">LegalEase <span className="font-normal">AI</span></span>
          </Link>
          <nav className="flex items-center gap-1.5" aria-label="Main navigation">
            <Link to="/" className="hidden rounded-md px-3 py-2 text-sm font-medium text-primary sm:block">My documents</Link>
            <Link to="/privacy" className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"><ShieldCheck className="size-4" /><span>Privacy</span></Link>
            <div className="ml-2 flex size-9 items-center justify-center rounded-full bg-legal-lavender text-sm font-semibold text-primary" aria-label="Your local workspace">LE</div>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 pb-16 pt-8 sm:px-8 sm:pt-11">
        <div className="flex flex-wrap items-end justify-between gap-5 animate-in-soft">
          <div>
            <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-legal-teal/20 bg-legal-teal-soft px-2.5 py-1 text-xs font-medium text-legal-teal"><LockKeyhole className="size-3.5" /> Private by design</div>
            <h1 className="text-[30px] font-semibold leading-tight tracking-normal text-legal-navy sm:text-[34px]">Make the fine print feel clearer.</h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-6 text-muted-foreground">A calmer way to review an agreement, one clause at a time.</p>
          </div>
          <Button onClick={() => fileInput.current?.click()} disabled={isImporting} className="h-10 rounded-md px-4 shadow-sm"><Plus className="size-4" />{isImporting ? "Reading on this device…" : "Review a document"}</Button>
          <input ref={fileInput} type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="sr-only" aria-label="Choose a PDF, Word document, or text file" onChange={(event) => { if (event.currentTarget.files) void importFiles(event.currentTarget.files); event.currentTarget.value = ""; }} />
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3" aria-label="Workspace overview">
          <OverviewCard icon={<FileSearch className="size-[18px]" />} iconClass="bg-legal-lavender text-primary" value={reviewed.toString()} label="Documents reviewed" footnote={reviewed === 1 ? "1 agreement in your workspace" : `${reviewed} agreements in your workspace`} />
          <OverviewCard icon={<Sparkles className="size-[18px]" />} iconClass="bg-legal-teal-soft text-legal-teal" value="Local" label="Text extraction" footnote="Files are read in your browser" />
          <OverviewCard icon={<ShieldCheck className="size-[18px]" />} iconClass="bg-legal-amber-soft text-legal-amber" value={totalAttention.toString()} label="Review prompts" footnote="Signals to look at, not legal conclusions" />
        </section>

        <section className="mt-9 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-lg font-semibold text-legal-navy">Your documents</h2><p className="mt-1 text-sm text-muted-foreground">Each review is saved in this browser.</p></div>
              <div className="relative w-full max-w-[240px]"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a document…" className="h-9 border-legal-line bg-card pl-9" aria-label="Search your documents" /></div>
            </div>
            <div className="mb-4 flex gap-1 overflow-x-auto border-b border-legal-line" role="tablist" aria-label="Document categories">
              {["All documents", "Rental agreement", "Employment contract", "Service agreement", "Other"].map((category) => <button key={category} type="button" role="tab" aria-selected={selectedCategory === category} onClick={() => setSelectedCategory(category)} className={`shrink-0 border-b-2 px-3 py-2.5 text-sm transition-colors ${selectedCategory === category ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{category}</button>)}
            </div>

            {error && <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-md border border-legal-red/30 bg-legal-red-soft p-4 text-sm text-legal-red"><span>{error}</span><button type="button" aria-label="Dismiss error" onClick={() => setError("")}><X className="size-4" /></button></div>}

            {visibleDocuments.length > 0 ? <div className="divide-y divide-legal-line overflow-hidden rounded-md border border-legal-line bg-card" aria-live="polite">{visibleDocuments.map((document) => <DocumentRow key={document.id} document={document} />)}</div> : documents.length === 0 ? <UploadArea isDragging={isDragging} setIsDragging={setIsDragging} openPicker={() => fileInput.current?.click()} onDrop={(files) => void importFiles(files)} isImporting={isImporting} /> : <div className="rounded-md border border-legal-line bg-card px-6 py-12 text-center"><p className="font-medium">No matching documents</p><p className="mt-1 text-sm text-muted-foreground">Try a different search or category.</p></div>}
            {visibleDocuments.length > 0 && <button type="button" onClick={() => fileInput.current?.click()} disabled={isImporting} className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-legal-line bg-card py-3 text-sm text-muted-foreground transition hover:border-primary/50 hover:text-primary"><Plus className="size-4" /> Add another document</button>}
            <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-legal-teal" />Your files and extracted text stay in this browser’s storage. Clearing site data or changing browsers can remove them.</p>
          </div>

          <aside className="space-y-5">
            <section className="rounded-md border border-legal-line bg-card p-5">
              <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold text-legal-navy">Start with a document type</h2><Plus className="size-4 text-muted-foreground" /></div>
              <div className="space-y-1">{categories.map(({ name, Icon, description }) => <button key={name} type="button" onClick={() => fileInput.current?.click()} className="legal-lift flex w-full items-center gap-3 rounded-md p-2.5 text-left"><span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-legal-lavender text-primary"><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-foreground">{name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{description}</span></span><Plus className="size-4 text-muted-foreground" /></button>)}</div>
            </section>
            <section className="rounded-md border border-legal-line bg-card p-5">
              <div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-md bg-legal-amber-soft text-legal-amber"><Sparkles className="size-4" /></span><h2 className="text-sm font-semibold text-legal-navy">Local review tools</h2></div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Your document is read on this device. Automatic checks highlight matching language and show the original wording.</p>
              <div className="mt-3 rounded-md bg-muted/70 p-3 text-xs leading-5 text-muted-foreground">An on-device Gemma AI model is not connected yet. Reviews are limited to text matching—not AI-generated legal analysis.</div>
              <Link to="/privacy" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">Learn about privacy <span aria-hidden="true">→</span></Link>
            </section>
            <p className="text-xs leading-5 text-muted-foreground">For informational purposes only. Not legal advice and not a substitute for a qualified professional.</p>
          </aside>
        </section>
      </main>
    </div>
  );
}

function detectCategory(text: string): string {
  const normalized = text.toLowerCase();
  if (/\b(tenant|landlord|lease|rental|rent|security deposit)\b/.test(normalized)) return "Rental agreement";
  if (/\b(employer|employee|salary|employment|job title)\b/.test(normalized)) return "Employment contract";
  if (/\b(service provider|scope of work|services|deliverables|client)\b/.test(normalized)) return "Service agreement";
  return "Other";
}

function OverviewCard({ icon, iconClass, value, label, footnote }: { icon: React.ReactNode; iconClass: string; value: string; label: string; footnote: string }) {
  return <div className="flex items-start gap-3.5 rounded-md border border-legal-line bg-card p-4"><span className={`flex size-9 shrink-0 items-center justify-center rounded-md ${iconClass}`}>{icon}</span><div className="min-w-0"><div className="flex items-baseline gap-2"><span className="text-xl font-semibold leading-6 text-legal-navy">{value}</span><span className="text-sm font-medium text-foreground">{label}</span></div><p className="mt-1 text-xs text-muted-foreground">{footnote}</p></div></div>;
}

function DocumentRow({ document }: { document: ReviewDocument }) {
  const importantFindings = document.findings.filter((finding) => finding.level !== "informational").length;
  const Icon = document.kind === "pdf" ? FileText : document.kind === "docx" ? FileCheck2 : FileSearch;
  return <Link to="/documents/$docId" params={{ docId: document.id }} className="legal-lift flex min-w-0 items-center gap-3.5 p-4 sm:gap-4">
    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-legal-lavender text-primary"><Icon className="size-[18px]" /></span>
    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-foreground">{document.name}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{document.category} <span className="mx-1">·</span> {formatDate(document.updatedAt)}</span></span>
    <span className="hidden text-right sm:block"><span className={`block text-sm font-medium ${importantFindings ? "text-legal-amber" : "text-legal-teal"}`}>{importantFindings ? `${importantFindings} review prompt${importantFindings === 1 ? "" : "s"}` : "No prompts"}</span><span className="mt-1 block text-xs text-muted-foreground">{document.findings.length} text signals</span></span>
    <span className="rounded bg-muted px-2 py-1 text-[10px] font-medium uppercase tracking-normal text-muted-foreground">{document.kind}</span>
  </Link>;
}

function UploadArea({ isDragging, setIsDragging, openPicker, onDrop, isImporting }: { isDragging: boolean; setIsDragging: (value: boolean) => void; openPicker: () => void; onDrop: (files: FileList) => void; isImporting: boolean }) {
  return <div onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false); }} onDrop={(event) => { event.preventDefault(); setIsDragging(false); if (event.dataTransfer.files.length) onDrop(event.dataTransfer.files); }} className={`flex min-h-[265px] flex-col items-center justify-center rounded-md border border-dashed px-5 py-9 text-center transition-colors ${isDragging ? "border-primary bg-legal-lavender" : "border-legal-line bg-card"}`}>
    <div className="flex size-12 items-center justify-center rounded-full bg-legal-lavender text-primary">{isImporting ? <span className="size-5 animate-spin rounded-full border-2 border-primary/25 border-t-primary" aria-label="Reading file" /> : <Upload className="size-5" />}</div>
    <h3 className="mt-4 text-[15px] font-semibold text-legal-navy">{isImporting ? "Reading your file on this device…" : "Bring an agreement into focus"}</h3>
    <p className="mt-1.5 max-w-md text-sm leading-5 text-muted-foreground">Drop your PDF, Word document, or text file here to see its key terms and clauses.</p>
    <Button variant="outline" onClick={openPicker} disabled={isImporting} className="mt-4 h-9 border-legal-line bg-card px-3.5"><Plus className="size-4" /> Choose a document</Button>
    <p className="mt-3 text-xs text-muted-foreground">PDF, DOCX, or TXT <span className="mx-1">·</span> Up to 25 MB</p>
  </div>;
}

function formatDate(value: number) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(value); }