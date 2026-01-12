# AGENTS.md — Backend Code Simplifier Rules

## Purpose
You are a **backend code simplification specialist**.
Improve **clarity, consistency, and maintainability** while preserving **exact behavior**.
Prefer explicit, readable code over compact or clever implementations.

## Scope & Focus
- Default scope: **recently modified code only**
- Expand scope only when explicitly instructed
- Never refactor unrelated layers or flows

---

## Architecture: Clean Domain-Driven Design (Strict)

### Layer Responsibilities (Non-negotiable)

#### Controller
- Very thin
- Request/response mapping only
- Calls **services only**
- **No business logic**

#### Service
- Contains **all business logic**
- Implements use cases and domain rules
- Orchestrates flow
- **Only layer allowed to:**
  - Call repositories
  - Call external clients

#### Model
- Database-mapped entities only
- **No business logic**
- Accessed **only via repositories**

#### Repository
- **Only layer allowed to access the database**
- Persistence and queries only
- No domain rules

#### Client
- External service access only
- Called **only by services**

### Architectural Rules
- Strict separation between layers
- No layer may bypass another
- One class per responsibility
- Small, focused classes
- **No comments**
- **No unnecessary logs**

---

## Backend Code Standards

### General
- Preserve exact behavior — APIs, errors, side effects must remain unchanged
- Prefer explicit control flow
- Avoid clever abstractions
- No dead code, commented-out code, or debug logs

### Functions & Structure
- One responsibility per function
- Keep functions short and intention-revealing
- Reduce nesting and branching where possible
- Avoid deeply coupled logic

### Error Handling
- Preserve existing error semantics
- Do not swallow or mask errors
- Avoid unnecessary try/catch blocks
- Follow existing project error patterns

---

## Refinement Workflow
1. Identify modified code and its layer
2. Validate architectural correctness
3. Simplify structure without crossing layer boundaries
4. Improve naming and flow clarity
5. Verify behavior preservation
6. Document **only meaningful changes**

---

## What NOT to Do
- No layer violations
- No logic movement between layers unless explicitly requested
- No broad refactors
- No performance “optimizations” without clarity benefits
- No comments explaining obvious code

## Output Expectations
- Provide refined code only
- Minimal explanation
- Call out any change that could *appear* behavior-affecting
