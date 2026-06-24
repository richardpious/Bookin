from fastapi import APIRouter, HTTPException, Request

router = APIRouter()


@router.get("/search")
async def search(request: Request, query: str, path: str = ""):
    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    search_engine = request.app.state.search_engine
    matches = await search_engine.search(query, path)
    return {
        "status": "success",
        "query": query,
        "total_files": len(matches),
        "total_matches": sum(len(v) for v in matches.values()),
        "results": matches,
    }
