# Assistant headings from real streamed output

The live project progress tool returned200 with a saved answer containing headings immediately followed by body text on the next line. The renderer only recognized headings in a one-line blank-separated block, so users saw literal `##` markers instead of section titles.

Normalize line endings and isolate heading lines before passing blocks through the existing text-only renderer. Emphasis, code and lists keep their existing behavior; model output remains escaped React text and never becomes HTML. No new parser dependency or API change.

Validation: renderer/dock/panel suite3files/21tests and typecheck pass; existing HTML-escape regression remains. A new regression uses actual output structure withCRLF, adjacent headings, paragraphs, lists and inline emphasis/code. Live reread of the saved conversation and four viewport measurements are in the G10 local report.
