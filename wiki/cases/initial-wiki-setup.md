# Initial Wiki Setup

Purpose: document the first application of the LLM Wiki pattern to this repository.

## Context

The user asked whether Karpathy's LLM Wiki pattern could be used to create a project wiki for `structured-feishu-whiteboard`. The decision was to follow the pattern directly rather than adding a separate engineering audit system.

## Decision

Create a minimal LLM Wiki structure:

- `raw/sources/` for immutable source documents,
- `wiki/schema.md` for agent operating rules,
- `wiki/index.md` for navigation,
- `wiki/log.md` for chronological wiki operations,
- `wiki/sources/` for source summaries,
- `wiki/topics/` for stable concepts,
- `wiki/cases/` for concrete applications.

## Why This Matters

The project is evolving through many visual and workflow decisions. Without a maintained knowledge layer, future agents may only read the latest Skill instructions and miss the reasoning behind them.

The wiki should preserve the reasoning while keeping the Skill focused on execution.

## Source

- `wiki/sources/karpathy-llm-wiki.md`
- `raw/sources/karpathy-llm-wiki.md`
