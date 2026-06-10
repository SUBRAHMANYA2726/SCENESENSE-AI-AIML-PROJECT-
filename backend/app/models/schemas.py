from pydantic import BaseModel
from typing import List, Optional, Any, Dict

class ChatMessage(BaseModel):
    role: str
    content: str

class FileAnalysisResponse(BaseModel):
    summary: str
    key_findings: List[str]
    confidence_score: float
    risks: List[str]
    recommendations: List[str]
    next_actions: List[str]
    visualizations: Optional[Dict[str, Any]] = None
    heatmap_url: Optional[str] = None
    predicted_class: Optional[str] = None
