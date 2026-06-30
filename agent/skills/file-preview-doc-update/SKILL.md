---
name: "file-preview-doc-update"
description: "Update file-preview tool documentation to specify session suffix format."
---

# file-preview Tool Documentation Update

The session_name parameter for the `file-preview` tool must be set to the suffix of the current session identifier. 

- Correct format: The portion of the session identifier that comes AFTER the prefix "agent:main:webchat:". 
- Example: If the session identifier is "agent:main:webchat:test5", the session_name should be "test5".

This ensures correct routing and display of file previews within the user interface.
