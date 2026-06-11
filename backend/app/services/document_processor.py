from pathlib import Path
from app.models.schemas import FileAnalysisResponse
import uuid

async def process_document(file_path: Path) -> FileAnalysisResponse:
    ext = file_path.suffix.lower()
    full_text = ""
    error_msg = None

    try:
        if ext == '.pdf':
            try:
                from langchain_community.document_loaders import PyPDFLoader
                loader = PyPDFLoader(str(file_path))
                docs = loader.load()
                full_text = "\n".join([doc.page_content for doc in docs])
            except Exception:
                # Fallback: pypdf directly
                import pypdf
                reader = pypdf.PdfReader(str(file_path))
                full_text = "\n".join(page.extract_text() or "" for page in reader.pages)

        elif ext in ('.txt', '.json'):
            full_text = file_path.read_text(encoding='utf-8', errors='ignore')

        elif ext == '.docx':
            try:
                from langchain_community.document_loaders import Docx2txtLoader
                loader = Docx2txtLoader(str(file_path))
                docs = loader.load()
                full_text = "\n".join([doc.page_content for doc in docs])
            except Exception:
                import docx2txt
                full_text = docx2txt.process(str(file_path))

        elif ext == '.ipynb':
            import json as _json
            nb = _json.loads(file_path.read_text(encoding='utf-8', errors='ignore'))
            cells = nb.get('cells', [])
            parts = []
            for cell in cells:
                src = ''.join(cell.get('source', []))
                if src.strip():
                    parts.append(src)
            full_text = "\n\n".join(parts)

    except Exception as e:
        error_msg = str(e)
        print(f"Document processing error: {e}")

    char_count = len(full_text)
    summary_text = (
        f"Document '{file_path.name}' loaded. "
        f"Type: {ext.upper()} | Length: {char_count:,} characters"
    )
    if error_msg:
        summary_text += f" | Warning: {error_msg}"

    return FileAnalysisResponse(
        id=str(uuid.uuid4()),
        filename=file_path.name,
        file_type=ext,
        size=file_path.stat().st_size if file_path.exists() else 0,
        summary=summary_text,
        # Store up to 40k chars of document text for RAG context
        key_findings=[full_text[:40000]] if full_text else []
    )
