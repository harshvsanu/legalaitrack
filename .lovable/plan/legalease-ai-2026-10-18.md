# LegalEase AI

## Goal
Replace the starter screen with a usable, privacy-first legal document review app based on the uploaded brief. Keep document content and analysis in the browser; be explicit that local AI inference is not yet verified.

## Experience
- Build a polished responsive dashboard with recent documents, review categories, a clear local-processing status, and an upload action.
- Support local PDF, DOCX, and plain-text import, validate files, extract text on-device, persist data in IndexedDB, and provide an analysis workspace with summary, risk flags, clause explanations, evidence excerpts, and a document-grounded question box.
- Add a privacy center for local history/storage controls and deletion, plus a before-signing checklist and downloadable report.
- Make all limitations and legal-information disclaimers clear; never claim legal advice, verified AI inference, or privacy guarantees beyond the implemented local-only processing.

## Technical approach
- Use the existing TanStack Start, React, and Tailwind v4 project; keep extraction, analysis, and persistence in browser-only utilities, with no document uploads or server processing.
- Add local PDF/DOCX parsing dependencies, IndexedDB persistence, routes for the workspace and privacy center, and route-specific metadata.
- Establish the brief's navy/indigo/teal legal-tech visual system in `src/styles.css`; use the existing design-system components where available.
- Add focused tests for client analysis rules and local persistence/import behavior where practical; validate build output and the public UI.

## Boundaries
- A compatible Gemma 3n runtime/model download, OCR for scanned PDFs, and verified PWA/offline model caching are not assumed deliverable without a proven runtime and model licensing/source. Present unavailable capabilities honestly rather than simulating them.
