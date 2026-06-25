# Karpathy LLM Wiki Pattern

Purpose: summarize the source `raw/sources/karpathy-llm-wiki.md` and connect it to this project wiki.

## Source

- Raw file: `raw/sources/karpathy-llm-wiki.md`
- Original URL: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- Retrieved: 2026-06-25

## Core Idea

The source argues for a persistent, LLM-maintained wiki instead of a query-time-only RAG workflow. Raw documents are not merely retrieved every time a question is asked. They are ingested once, synthesized into a structured wiki, cross-linked with existing pages, and kept current as new sources and questions arrive.

The important distinction is that the wiki becomes a compounding artifact. It accumulates summaries, contradictions, entity pages, concept pages, comparisons, and evolving syntheses.

## Architecture

The pattern has three layers:

- Raw sources: immutable source documents, stored separately and never edited by the LLM.
- Wiki: LLM-generated markdown pages that summarize, synthesize, cross-reference, and maintain knowledge.
- Schema: a rule document that tells future agents how the wiki is structured and how to operate on it.

## Operations

The source describes three core operations:

- Ingest: read a new source, summarize it, integrate it into existing pages, update the index, and append to the log.
- Query: answer questions against the wiki, then optionally file valuable answers back into the wiki.
- Lint: periodically check for contradictions, stale claims, orphan pages, missing cross-references, and knowledge gaps.

## Index And Log

The source recommends two special files:

- `index.md`: content-oriented navigation for the wiki.
- `log.md`: chronological record of ingest, query, and lint operations.

## Implication For This Project

For `structured-feishu-whiteboard`, the wiki should not be a dump of chat history. It should compile durable knowledge about what makes a good Feishu whiteboard Skill:

- accepted visual principles,
- rejected layout patterns,
- long-form content handling,
- Skill stability rules,
- recurring defects and fixes,
- source-backed decisions.

Related pages:

- `wiki/topics/llm-wiki-pattern.md`
- `wiki/topics/structured-feishu-whiteboard-knowledge-scope.md`
