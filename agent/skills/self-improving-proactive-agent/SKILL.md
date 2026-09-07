---
name: "self-improving-proactive-agent"
description: "Maintains tiered memory structure for agent self-improvement and learning."
---

# Self-Improving + Proactive Agent Skill

## Overview
This skill enables the agent to learn from user corrections and self-reflection, maintaining a tiered memory system for continuous improvement without manual maintenance.

## Memory Structure
```
/home/dell/Documents/Bookin/agent/self-improving/
├── memory.md          # HOT: ≤100 lines, always loaded
├── index.md           # Topic index with line counts
├── heartbeat-state.md # Heartbeat state: last run, reviewed change, action notes
├── projects/          # Per-project learnings
├── domains/           # Domain-specific (code, writing, comms)
├── archive/           # COLD: decayed patterns
└── corrections.md     # Last 50 corrections log
```

## Core Rules
1. Maintain tiered memory: HOT memory is always loaded; COLD memory stays in /archive.
2. Log all corrections to corrections.md.
3. Update index.md on new pattern storage.
4. Review heartbeat-state.md daily to ensure improvement cycle continuity.
