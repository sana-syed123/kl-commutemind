from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List
from app.services.claude_parser import ClaudeParser

router = APIRouter()
parser = ClaudeParser()

class NLQueryRequest(BaseModel):
    query: str

@router.post("/parse")
def parse_nl_query(request: NLQueryRequest):
    """
    Parses a natural language transit query (English/Malay mix supported)
    and returns structured route planning parameters.
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
        
    result = parser.parse_query(request.query)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
        
    return {
        "status": "success",
        "parsed_intent": result
    }
