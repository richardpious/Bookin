---
name: "self-improving-proactive-agent"
description: "Update storage path to /home/dell/Documents/Bookin/agent/self-improving/"
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
... (rest of the original content updated with new base path)
