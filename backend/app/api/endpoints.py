from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List, Optional
import os
import shutil
from pathlib import Path
from app.models.schemas import FileAnalysisResponse, ChatMessage
from app.services.image_processor import process_image
from app.services.dataset_processor import process_dataset
from app.services.document_processor import process_document

router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@router.post("/upload", response_model=FileAnalysisResponse)
async def upload_file(file: UploadFile = File(...)):
    try:
        file_path = UPLOAD_DIR / file.filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        ext = file_path.suffix.lower()
        
        # Route to appropriate processor
        if ext in ['.jpg', '.jpeg', '.png']:
            response = await process_image(file_path)
        elif ext in ['.csv', '.xlsx']:
            response = await process_dataset(file_path)
        elif ext in ['.pdf', '.txt', '.docx', '.json', '.ipynb']:
            response = await process_document(file_path)
        else:
            # Default to document processor for any unknown file types
            response = await process_document(file_path)
            
        return response
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat")
async def chat(messages: List[ChatMessage]):
    # Placeholder for conversational memory & RAG logic
    last_msg = messages[-1].content
    return {
        "role": "assistant",
        "content": f"I understand you are asking about: {last_msg}. How can I assist you further?"
    }
