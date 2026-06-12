# Platform Backend AGENTS.md

## Purpose
Owns the BookIn FastAPI backend server, database model, API routing, and simulation job management.

## Ownership
Platform Backend Engineering

## Local Contracts
- The server must run on FastAPI.
- Persistence of logs and simulation records must be managed using the SQLite database `chat_history.db` via `chat_history.py`.

## Work Guidance
- Run backend locally using `fastapi dev` or `uvicorn main:app --reload`.
- Ensure new endpoints are properly validated and documented.

## Verification
- Run local fastapi server and verify endpoints via Swagger UI `/docs` or endpoint curl checks.

## Child DOX Index
- None
