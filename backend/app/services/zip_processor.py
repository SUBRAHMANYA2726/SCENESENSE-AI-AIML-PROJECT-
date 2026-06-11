import os
import shutil
import uuid
import zipfile
import json
from pathlib import Path
from typing import List, Any

from app.models.schemas import FileAnalysisResponse, DatasetStats, AnalysisResult
from app.services.image_processor import process_image
from app.services.dataset_processor import process_dataset
from app.services.document_processor import process_document
from app.services.llm_service import generate_ai_decision_engine_report


async def process_zip(file_path: Path) -> FileAnalysisResponse:
    """
    Extracts a ZIP file, processes all supported files inside,
    and returns a combined AI DECISION ENGINE report.
    """
    extract_dir = file_path.parent / f"extracted_{uuid.uuid4()}"
    extract_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        with zipfile.ZipFile(file_path, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)
    except Exception as e:
        return FileAnalysisResponse(
            id=str(uuid.uuid4()),
            filename=file_path.name,
            file_type=".zip",
            size=file_path.stat().st_size if file_path.exists() else 0,
            summary=f"Failed to extract ZIP: {str(e)}"
        )
    
    supported_files = []
    for root, _, files in os.walk(extract_dir):
        for file in files:
            ext = Path(file).suffix.lower()
            if ext in [".csv", ".xlsx", ".xls", ".pdf", ".docx", ".txt", ".jpg", ".jpeg", ".png", ".webp", ".json"]:
                supported_files.append(Path(root) / file)
                
    if not supported_files:
        empty_report = (
            "==================================================\n"
            "AI DECISION ENGINE\n"
            "==================\n\n"
            "Detected Category : Empty or Unsupported Archive\n\n"
            "Confidence        : 100.0 %\n\n"
            "Model Accuracy    : 0.0 %\n\n"
            "Recommendations\n\n"
            "Best Option:\n"
            "Reject File\n\n"
            "Key Findings:\n"
            "• The uploaded ZIP archive was successfully extracted.\n"
            "• No supported data files (CSV, XLSX, PDF, Images) were found inside.\n"
            "• The system cannot perform further analysis on an empty dataset.\n\n"
            "Suggested Actions:\n"
            "• Please verify the contents of the ZIP file.\n"
            "• Ensure it contains valid data files (e.g., .csv, .xlsx, .pdf, .jpg).\n"
            "• Re-upload the corrected archive.\n\n"
            "Risk Level:\n"
            "LOW\n\n"
            "Final Decision:\n"
            "The extraction process completed, but the directory did not contain any formats supported by the analysis engine.\n\n"
            "=================================================="
        )
        return FileAnalysisResponse(
            id=str(uuid.uuid4()),
            filename=file_path.name,
            file_type=".zip",
            size=file_path.stat().st_size,
            summary=empty_report
        )

    aggregated_json = {"zip_filename": file_path.name, "files_processed": []}
    
    # Process each file
    all_key_findings = []
    
    for sf in supported_files:
        ext = sf.suffix.lower()
        if ext in [".jpg", ".jpeg", ".png", ".webp"]:
            resp = await process_image(sf)
        elif ext in [".csv", ".xlsx", ".xls"]:
            resp = await process_dataset(sf)
        else:
            resp = await process_document(sf)
            
        file_info = {
            "filename": sf.name,
            "type": ext,
            "summary": resp.summary
        }
        
        if resp.analysis:
            file_info["analysis"] = {
                "task_type": resp.analysis.task_type,
                "model_results": [{"model": m.model_name, "score": m.value} for m in (resp.analysis.model_results or [])],
                "insights": resp.analysis.key_insights
            }
        
        if resp.stats:
            file_info["stats"] = {
                "rows": resp.stats.rows,
                "columns": resp.stats.columns
            }
            
        if resp.scene_decision:
            file_info["scene"] = {
                "detected": resp.scene_decision.detected_scene,
                "confidence": resp.scene_decision.confidence
            }
            
        aggregated_json["files_processed"].append(file_info)
        
        if resp.key_findings:
            all_key_findings.extend(resp.key_findings)

    # Generate final AI DECISION ENGINE report
    json_context_str = json.dumps(aggregated_json, indent=2)
    final_report = generate_ai_decision_engine_report(json_context_str)
    
    return FileAnalysisResponse(
        id=str(uuid.uuid4()),
        filename=file_path.name,
        file_type=".zip",
        size=file_path.stat().st_size,
        summary=final_report,
        key_findings=all_key_findings[:5] # Limit findings
    )
