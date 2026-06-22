---
name: "update-file-preview-skill-metadata-note"
description: "Update file-preview SKILL.md to include sender metadata note."
---

# File Preview

Use this tool to notify the frontend about file contents before they are processed or used.

## Usage

When you need to show a file preview, call the `send.py` script with the required parameters:

```bash
python3 ~/.openclaw/plugin-skills/file-preview/scripts/send.py \
  --session_name <session_suffix> \
  --file_path <path_to_file>
```

This will trigger a system message of type `file-preview` to the frontend, allowing the user to review the file content.

## Parameters

- `session_name`: The session suffix, which is the part of the session identifier that comes AFTER the prefix "agent:main:webchat:". (e.g., if the session identifier is "agent:main:webchat:test5", the `session_name` should be "test5").
- `file_path`: Relative path to the file from the Bookin root. (e.g., "booksim/src/examples/mesh88_lat").

## Sender Metadata
All calls to the `file-preview` tool must be associated with the following sender metadata:
```json
{
  "label": "gateway-client",
  "id": "gateway-client"
}
```
