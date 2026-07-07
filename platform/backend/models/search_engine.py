import asyncio
import json
import os

from fastapi import HTTPException

# Calculate project root relative to this file's location
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.getenv("PROJECT_ROOT", os.path.abspath(os.path.join(BASE_DIR, "../..")))
BOOKSIM_DIR = os.path.join(PROJECT_ROOT, "booksim")


class SearchEngine:
    """Wraps ripgrep to provide project-wide file search."""

    def __init__(self, default_search_path: str = BOOKSIM_DIR):
        self.default_search_path = default_search_path

    async def search(self, query: str, path: str = "") -> dict:
        """
        Run a case-insensitive ripgrep search and return matches grouped by file.

        Returns:
            {
                "file/path.py": [
                    {"line": 12, "text": "...", "submatches": [{"start": 0, "end": 5, "text": "..."}]},
                    ...
                ],
                ...
            }
        """
        search_path = path.strip() if path.strip() else self.default_search_path
        return await self._run_ripgrep(query, search_path)

    async def _run_ripgrep(self, query: str, search_path: str) -> dict:
        cmd = [
            "rg",
            "--json",           # Machine-readable JSON output, one object per line
            "-i",               # Case-insensitive
            "--max-count=50",   # Cap matches per file to avoid huge payloads
            query,
            search_path,
        ]

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await asyncio.wait_for(process.communicate(), timeout=10.0)
        except asyncio.TimeoutError:
            raise HTTPException(status_code=408, detail="Search timed out")
        except FileNotFoundError:
            raise HTTPException(
                status_code=500,
                detail="ripgrep (rg) is not installed. Run: sudo apt-get install ripgrep",
            )

        return self._parse_output(stdout)

    def _parse_output(self, stdout: bytes) -> dict:
        """Parse ripgrep's newline-delimited JSON output into grouped results."""
        results: dict[str, list] = {}

        if not stdout:
            return results

        for raw_line in stdout.decode("utf-8", errors="replace").splitlines():
            raw_line = raw_line.strip()
            if not raw_line:
                continue
            try:
                data = json.loads(raw_line)
            except json.JSONDecodeError:
                continue

            # ripgrep emits 'begin', 'match', 'end', and 'summary' events
            if data.get("type") != "match":
                continue

            match_data = data["data"]
            abs_path = match_data["path"]["text"]
            # Return path relative to project root (e.g. "booksim/src/router.cpp")
            file_path = os.path.relpath(abs_path, PROJECT_ROOT)
            line_number = match_data["line_number"]
            line_text = match_data["lines"]["text"].rstrip("\n")
            submatches = [
                {"start": sm["start"], "end": sm["end"], "text": sm["match"]["text"]}
                for sm in match_data.get("submatches", [])
            ]

            if file_path not in results:
                results[file_path] = []
            results[file_path].append(
                {"line": line_number, "text": line_text, "submatches": submatches}
            )

        return results

