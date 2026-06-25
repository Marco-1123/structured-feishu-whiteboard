# LLM Wiki Schema

This wiki follows the LLM Wiki pattern described by Andrej Karpathy: raw sources remain immutable, while the LLM maintains a structured, interlinked markdown wiki that compounds over time.

## Layers

### Raw sources

Raw sources live under `raw/sources/`.

Rules:

- Treat raw sources as source of truth.
- Do not edit raw source files after ingestion.
- If a source changes upstream, add a new source file or note the retrieval date instead of rewriting the old one.
- Use raw sources for provenance when updating wiki pages.

### Wiki

The wiki lives under `wiki/`.

Rules:

- The LLM owns wiki maintenance.
- The user owns source curation, direction, review, and judgment.
- Wiki pages should synthesize, cross-reference, and update existing knowledge instead of only appending summaries.
- Prefer stable pages that can be reused by future agents.
- Use wiki links in plain markdown form, for example `wiki/topics/llm-wiki-pattern.md`.

### Schema

This file is the operating contract for future agents.

Rules:

- Read `wiki/index.md` first before answering project-knowledge questions.
- Read this schema before ingesting new sources or restructuring the wiki.
- Update `wiki/index.md` after every ingest that creates or materially changes pages.
- Append one entry to `wiki/log.md` after every ingest, query that is filed back into the wiki, or lint pass.

## Operations

### Ingest

When ingesting a new source:

1. Store the source in `raw/sources/`.
2. Read the full source.
3. Create or update a source summary in `wiki/sources/`.
4. Update relevant topic or case pages.
5. Add cross-references between pages.
6. Update `wiki/index.md`.
7. Append to `wiki/log.md`.

Do not create a standalone source summary and stop there if the source changes existing beliefs or operating rules.

### Query

When answering from the wiki:

1. Read `wiki/index.md`.
2. Open the most relevant topic, source, and case pages.
3. Answer with references to the pages used.
4. If the answer produces durable knowledge, file it back into the wiki and log it.

### Lint

When asked to lint the wiki:

- Look for stale claims.
- Look for contradictions between pages.
- Look for orphan pages with no incoming or outgoing references.
- Look for important concepts that deserve their own page.
- Look for missing source references.
- Update pages only after identifying the issue.
- Log the lint pass.

## Page Conventions

Each wiki page should include:

- A clear title.
- A short purpose statement.
- Source references where relevant.
- Links to related pages.
- Concrete operating implications for this project when useful.

Avoid:

- Chat transcripts.
- Low-value execution logs.
- Duplicating raw source text.
- Unlinked standalone notes.
- Treating the wiki as a generic dump folder.
