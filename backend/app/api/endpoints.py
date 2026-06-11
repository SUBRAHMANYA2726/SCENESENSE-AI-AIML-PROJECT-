from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
import uuid
import json
from pathlib import Path

from app.models.schemas import FileAnalysisResponse, ChatMessage, ChatSessionResponse, ChatSessionDetail
from app.models.database import get_db, ChatSession, Message as DBMessage, UploadedFile as DBFile
from app.services.image_processor import process_image
from app.services.dataset_processor import process_dataset
from app.services.document_processor import process_document
from app.services.zip_processor import process_zip
from app.services.llm_service import generate_streaming_response, generate_ai_decision_engine_report

router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@router.post("/upload", response_model=FileAnalysisResponse)
async def upload_file(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    db: Session = Depends(get_db)
):
    try:
        # Ensure session exists
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not session:
            session = ChatSession(id=session_id, title=f"Chat {session_id[:6]}")
            db.add(session)
            db.commit()

        file_path = UPLOAD_DIR / f"{uuid.uuid4()}_{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        ext = file_path.suffix.lower()

        # Route to appropriate processor
        if ext in (".jpg", ".jpeg", ".png", ".webp"):
            response = await process_image(file_path)
        elif ext in (".csv", ".xlsx", ".xls"):
            response = await process_dataset(file_path)
        elif ext == ".zip":
            response = await process_zip(file_path)
        else:
            response = await process_document(file_path)

        # Build JSON context for the AI DECISION ENGINE report
        file_info = {
            "filename": response.filename,
            "type": response.file_type,
            "summary": response.summary,
        }
        if response.analysis:
            file_info["analysis"] = {
                "task_type": response.analysis.task_type,
                "model_results": [{"model": m.model_name, "score": m.value} for m in (response.analysis.model_results or [])],
                "insights": response.analysis.key_insights
            }
        if response.stats:
            file_info["stats"] = {
                "rows": response.stats.rows,
                "columns": response.stats.columns
            }
        if response.scene_decision:
            file_info["scene"] = {
                "detected": response.scene_decision.detected_scene,
                "confidence": response.scene_decision.confidence,
                "model_accuracy": response.scene_decision.model_accuracy
            }
            
        if ext != ".zip":
            json_context_str = json.dumps({"files_processed": [file_info]}, indent=2)
            final_report = generate_ai_decision_engine_report(json_context_str)
            response.summary = final_report

        # Store file reference
        db_file = DBFile(
            id=response.id,
            session_id=session_id,
            filename=file.filename,
            file_type=response.file_type,
            file_path=str(file_path)
        )
        db.add(db_file)

        # Build rich context for the LLM
        context_parts = [f"User uploaded file: {file.filename}", f"Summary: {response.summary}"]

        if response.analysis:
            a = response.analysis
            context_parts.append(f"\nML Task Type: {a.task_type}")
            context_parts.append(f"Task Reason: {a.task_reason}")
            if a.key_insights:
                context_parts.append("Key Insights:\n" + "\n".join(f"  - {i}" for i in a.key_insights))
            if a.recommendations:
                context_parts.append("Recommendations:\n" + "\n".join(f"  - {r}" for r in a.recommendations))
            if a.model_results:
                context_parts.append("Model Results:\n" + "\n".join(
                    f"  - {m.model_name}: {m.metric_name}={m.value:.4f}" for m in a.model_results
                ))
            if a.executive_summary:
                context_parts.append(f"Executive Summary:\n{a.executive_summary}")

        if response.stats:
            s = response.stats
            context_parts.append(
                f"\nDataset Shape: {s.rows} rows × {s.columns} columns"
                f"\nMissing Values: {s.missingValues}"
                f"\nColumns: {', '.join(s.previewColumns)}"
            )
            if s.numeric_summary:
                context_parts.append("Numeric Statistics: " + json.dumps(
                    {k: {sk: sv for sk, sv in v.items() if sk in ("mean", "std", "min", "max")}
                     for k, v in s.numeric_summary.items()}, indent=2
                ))

        if response.key_findings:
            context_parts.append("Content:\n" + "\n".join(response.key_findings[:2]))

        if response.scene_decision:
            sd = response.scene_decision
            context_parts.append(
                f"\nScene Detection: {sd.detected_scene} ({sd.confidence:.1f}% confidence)"
                f"\nBest Season: {sd.best_season}"
                f"\nActivities: {sd.activities}"
                f"\nSafety: {sd.safety}"
            )

        context_text = "\n".join(context_parts)

        db_msg = DBMessage(
            id=str(uuid.uuid4()),
            session_id=session_id,
            role="system",
            content=context_text
        )
        db.add(db_msg)
        db.commit()

        return response

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat")
async def chat(
    message: ChatMessage,
    db: Session = Depends(get_db)
):
    session_id = message.session_id
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")

    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        session = ChatSession(id=session_id, title=f"Chat {session_id[:6]}")
        db.add(session)
        db.commit()

    # Save user message
    user_msg_id = message.id or str(uuid.uuid4())
    db_msg = DBMessage(
        id=user_msg_id,
        session_id=session_id,
        role="user",
        content=message.content
    )
    db.add(db_msg)
    db.commit()

    # Retrieve full history
    history = db.query(DBMessage).filter(
        DBMessage.session_id == session_id
    ).order_by(DBMessage.created_at).all()

    chat_history = []
    context_blocks = []
    for h in history:
        if h.role == "system":
            context_blocks.append(h.content)
        else:
            chat_history.append({"role": h.role, "content": h.content})

    full_context = "\n\n---\n\n".join(context_blocks)

    def stream_generator():
        full_response = ""
        for chunk in generate_streaming_response(chat_history, context=full_context):
            full_response += chunk
            yield chunk

        # Persist assistant message
        local_db = next(get_db())
        try:
            local_db.add(DBMessage(
                id=str(uuid.uuid4()),
                session_id=session_id,
                role="assistant",
                content=full_response
            ))
            local_db.commit()
        finally:
            local_db.close()

    return StreamingResponse(stream_generator(), media_type="text/plain; charset=utf-8")


@router.get("/sessions", response_model=List[ChatSessionResponse])
def get_sessions(db: Session = Depends(get_db)):
    sessions = db.query(ChatSession).order_by(ChatSession.updated_at.desc()).all()
    return sessions


@router.get("/sessions/{session_id}", response_model=ChatSessionDetail)
def get_session_detail(session_id: str, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = [
        ChatMessage(id=m.id, role=m.role, content=m.content,
                    session_id=m.session_id, timestamp=m.created_at)
        for m in session.messages if m.role != "system"
    ]

    files = []
    for f in session.files:
        files.append(FileAnalysisResponse(
            id=f.id,
            filename=f.filename,
            file_type=f.file_type,
            size=0,
            summary="File attached to session"
        ))

    return ChatSessionDetail(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        messages=messages,
        files=files
    )


@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"status": "success"}
