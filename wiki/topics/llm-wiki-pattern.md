# LLM Wiki Pattern

Purpose: define the operating model this repository uses for project knowledge.

## Principle

The wiki is a persistent knowledge layer maintained by the LLM. It sits between raw sources and future answers. The goal is to compile knowledge once, keep it current, and make later work start from accumulated understanding instead of rediscovering context from scratch.

## What Makes It Different From RAG

RAG retrieves fragments from raw documents at query time. This wiki pattern turns important source material into maintained pages before future questions are asked.

That means:

- cross-references already exist,
- contradictions can be recorded,
- summaries can evolve,
- stable principles can be reused,
- new agents can start from the index and schema instead of reconstructing history.

## Required Files

- `raw/sources/`: immutable source materials.
- `wiki/schema.md`: operating rules for future agents.
- `wiki/index.md`: content-oriented map of the wiki.
- `wiki/log.md`: chronological record of wiki operations.
- `wiki/sources/`: source summaries.
- `wiki/topics/`: stable concepts and principles.
- `wiki/cases/`: concrete examples and applications.

## Operating Loop

### Ingest

Add a source, read it, summarize it, update relevant topic and case pages, update the index, and append to the log.

### Query

Use the index to find relevant pages, answer from the wiki, and file durable insights back into the wiki when useful.

### Lint

Periodically inspect the wiki for stale claims, contradictions, orphan pages, missing links, and missing concepts.

## Project-Specific Interpretation

For this repository, the wiki should make future work on `structured-feishu-whiteboard` more stable. It should help future agents understand:

- why onepage is preferred over split-screen output for rich but unified materials,
- why long vertical canvases were rejected,
- why professional blue-white is the default style,
- how visual issues such as text overflow, border crowding, invalid whitespace, and repeated metrics should be judged,
- which rules belong in the Skill itself and which belong only in project knowledge.

Related pages:

- `wiki/sources/karpathy-llm-wiki.md`
- `wiki/topics/structured-feishu-whiteboard-knowledge-scope.md`
