# Structured Feishu Whiteboard Knowledge Scope

Purpose: define what this wiki should remember for the `structured-feishu-whiteboard` project.

## What The Wiki Should Capture

This wiki should preserve durable knowledge that improves future Skill work:

- visual principles approved by the user,
- layout patterns that work well,
- layout patterns that were rejected,
- Feishu SVG compatibility constraints,
- long-form input strategy,
- recurring rendering defects,
- decisions that affect future versions,
- source-backed design and workflow ideas.

## What The Wiki Should Not Become

The wiki should not become a raw chat archive or a command log. It should not store every intermediate attempt unless the attempt teaches a reusable principle.

Execution details may appear in `wiki/log.md` only at the level of wiki operations: ingest, query filed back into the wiki, or lint.

## Relationship To The Skill

The Skill remains the operational layer. It tells agents how to generate structured Feishu whiteboards.

The wiki is the knowledge layer. It explains why certain rules exist and preserves reusable project judgment.

When a wiki principle becomes stable and operationally necessary, it can later be promoted into:

- `SKILL.md`,
- `references/*.md`,
- scripts,
- schema files,
- test fixtures.

## Current Initial Knowledge Areas

The wiki should first focus on:

- LLM Wiki maintenance pattern,
- onepage canvas strategy,
- long-form content handling,
- visual quality standards,
- rejected long vertical canvas and split-frame patterns,
- blue-white style expectations,
- deterministic rendering and validation.

Related pages:

- `wiki/topics/llm-wiki-pattern.md`
- `wiki/cases/initial-wiki-setup.md`
