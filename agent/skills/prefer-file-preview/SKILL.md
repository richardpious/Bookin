---
name: "prefer-file-preview"
description: "Prioritize file-preview tool for displaying file contents over reading raw text into chat."
---

# Skill: prefer-file-preview

## Purpose
Prioritize the use of the `file-preview` tool to display file contents to the user in the UI, rather than reading the raw file content into the chat text stream.

## Instructions
1. When the user requests to see a file, check a file, or inspect file content:
    - Do NOT use the `read` tool if a visual preview is appropriate.
    - DO use the `file-preview` tool.
2. Ensure the `file_path` is passed relative to the project root.
3. Extract the session suffix (e.g., 'main' from 'agent:main:webchat:') and pass it as the `--session_name` argument.
4. If `file-preview` fails or is inappropriate for the specific file type, fallback to `read`.
5. Proactively inform the user that the file is being opened in the viewer.
