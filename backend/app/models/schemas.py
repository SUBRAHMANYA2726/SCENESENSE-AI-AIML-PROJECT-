from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime


class ChatMessage(BaseModel):
    id: Optional[str] = None
    role: str
    content: str
    session_id: Optional[str] = None
    timestamp: Optional[datetime] = None


class ChartDataset(BaseModel):
    name: str
    data: List[Any] = []
    color: Optional[str] = None
    fill_color: Optional[str] = None


class ChartData(BaseModel):
    chart_type: str   # "bar", "line", "pie", "scatter", "heatmap", "area"
    title: str
    x_label: Optional[str] = None
    y_label: Optional[str] = None
    labels: List[str] = []
    datasets: List[Dict[str, Any]] = []   # [{name, data, color}]
    meta: Optional[Dict[str, Any]] = None  # extra config (e.g. heatmap matrix)


class DatasetStats(BaseModel):
    rows: int
    columns: int
    missingValues: int
    dataTypes: Dict[str, str]
    previewColumns: List[str]
    previewData: List[List[Any]]
    numeric_summary: Optional[Dict[str, Dict[str, Any]]] = None
    correlation_matrix: Optional[Dict[str, Dict[str, float]]] = None
    outlier_counts: Optional[Dict[str, int]] = None
    missing_per_column: Optional[Dict[str, int]] = None


class ModelMetric(BaseModel):
    model_name: str
    metric_name: str   # "Accuracy", "R²", "Silhouette"
    value: float
    extra: Optional[Dict[str, Any]] = None   # precision, recall, f1, etc.


class FeatureImportance(BaseModel):
    feature: str
    importance: float


class AnalysisResult(BaseModel):
    task_type: str   # "classification", "regression", "clustering", "time_series", "statistical"
    task_reason: str
    model_results: Optional[List[ModelMetric]] = None
    feature_importance: Optional[List[FeatureImportance]] = None
    predictions: Optional[Dict[str, Any]] = None
    executive_summary: str = ""
    key_insights: List[str] = []
    recommendations: List[str] = []
    trend_analysis: Optional[str] = None
    anomalies: Optional[List[str]] = None
    forecast: Optional[List[Dict[str, Any]]] = None


class SceneDecision(BaseModel):
    detected_scene: str
    confidence: float
    model_accuracy: float = 0.0
    best_season: str
    activities: str
    safety: str
    recommendation_text: Optional[str] = None


class FileAnalysisResponse(BaseModel):
    id: str = ""
    filename: str = ""
    file_type: str = ""
    size: int = 0
    summary: Optional[str] = None
    key_findings: Optional[List[str]] = []
    confidence_score: Optional[float] = None
    stats: Optional[DatasetStats] = None
    charts: Optional[List[ChartData]] = None
    analysis: Optional[AnalysisResult] = None
    scene_decision: Optional[SceneDecision] = None
    # image-specific
    predicted_class: Optional[str] = None
    heatmap_url: Optional[str] = None
    risks: Optional[List[str]] = []
    recommendations: Optional[List[str]] = []
    next_actions: Optional[List[str]] = []
    visualizations: Optional[Any] = None


class ChatSessionResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime


class ChatSessionDetail(ChatSessionResponse):
    messages: List[ChatMessage] = []
    files: List[FileAnalysisResponse] = []
