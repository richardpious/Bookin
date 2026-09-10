"""
Shared path utilities for the BookIn backend.

Provides a single source of truth for the project root directory
and a reusable path sanitization function used by file, simulation,
and VCD routes.
"""
import os
from typing import Optional

# Project root: platform/backend/paths.py -> ../..
# This gives us the Bookin/ directory (parent of platform/)
_PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..', '..')
)


def get_project_root() -> str:
    """Return the absolute path to the Bookin project root."""
    return _PROJECT_ROOT


def sanitize_path(path: str, *, must_exist: bool = True) -> Optional[str]:
    """
    Resolve a user-supplied relative path to an absolute path under the project root.

    Strips leading '../' and './' segments, normalizes the path, and ensures
    the result is within the project root directory.

    Args:
        path: A relative or absolute path string from the user/frontend.
        must_exist: If True (default), returns None if the resolved path
                    doesn't exist on disk.

    Returns:
        The resolved absolute path, or None if the path is outside the
        project root or (when must_exist=True) doesn't exist.
    """
    root = _PROJECT_ROOT

    if os.path.isabs(path):
        abs_path = os.path.normpath(path)
    else:
        # Strip leading ../ segments — the agent sends paths like
        # ../booksim/src/... which are relative to a parent context
        while path.startswith('../'):
            path = path[3:]
        if path.startswith('./'):
            path = path[2:]
        abs_path = os.path.normpath(os.path.join(root, path))

    # Security: must be under project root
    if not abs_path.startswith(root + os.sep) and abs_path != root:
        return None

    if must_exist and not os.path.exists(abs_path):
        return None

    return abs_path
