"""
Full ML analysis pipeline for CSV/Excel datasets.
Automatically detects task type and runs the appropriate sklearn model.
"""
import json
import uuid
import warnings
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingRegressor, GradientBoostingClassifier
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.cluster import KMeans
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.metrics import (
    accuracy_score, classification_report,
    r2_score, mean_absolute_error, mean_squared_error,
    silhouette_score
)
try:
    from xgboost import XGBClassifier, XGBRegressor
    from lightgbm import LGBMClassifier, LGBMRegressor
    from catboost import CatBoostClassifier, CatBoostRegressor
    EXTRA_MODELS_AVAILABLE = True
except ImportError:
    EXTRA_MODELS_AVAILABLE = False

from app.models.schemas import (
    FileAnalysisResponse, DatasetStats, AnalysisResult,
    ChartData, ModelMetric, FeatureImportance
)

warnings.filterwarnings("ignore")


# ─────────────────────────────────────────────────────────────
#  Helper utilities
# ─────────────────────────────────────────────────────────────

def _safe_float(v: Any) -> Optional[float]:
    try:
        f = float(v)
        return None if (np.isnan(f) or np.isinf(f)) else round(f, 6)
    except Exception:
        return None


def _detect_task_type(df: pd.DataFrame) -> Tuple[str, str, Optional[str]]:
    """
    Returns (task_type, reason, target_column).
    Heuristic order:
      1. Time-series  — if there is a date/time column
      2. Classification — last column is categorical / low-cardinality int
      3. Regression   — last column is continuous numeric
      4. Clustering   — no obvious target (all numeric)
      5. Statistical  — fallback
    """
    cols = list(df.columns)
    target = cols[-1] if cols else None

    # Check for datetime column
    date_cols = [c for c in cols if df[c].dtype == "object" and
                 _is_date_column(df[c])]
    if date_cols:
        return "time_series", f"A date/time column ('{date_cols[0]}') was detected.", target

    if target is None:
        return "statistical", "No columns found.", None

    target_series = df[target]
    nunique = target_series.nunique()
    dtype = target_series.dtype

    if dtype == "object" or (dtype in ["int64", "int32"] and nunique <= 20):
        return (
            "classification",
            f"Target column '{target}' has {nunique} unique categorical values — "
            "classification is appropriate.",
            target
        )

    if pd.api.types.is_numeric_dtype(dtype) and nunique > 20:
        return (
            "regression",
            f"Target column '{target}' is continuous numeric ({nunique} unique values) — "
            "regression is appropriate.",
            target
        )

    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    if len(numeric_cols) >= 2:
        return (
            "clustering",
            "No clear categorical/continuous target — clustering analysis applied.",
            None
        )

    return "statistical", "General statistical analysis applied.", None


def _is_date_column(series: pd.Series) -> bool:
    sample = series.dropna().head(20)
    try:
        pd.to_datetime(sample, infer_datetime_format=True)
        return True
    except Exception:
        return False


def _detect_outliers(df: pd.DataFrame) -> Dict[str, int]:
    """IQR-based outlier count per numeric column."""
    result = {}
    for col in df.select_dtypes(include="number").columns:
        q1 = df[col].quantile(0.25)
        q3 = df[col].quantile(0.75)
        iqr = q3 - q1
        lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        count = int(((df[col] < lower) | (df[col] > upper)).sum())
        result[col] = count
    return result


def _correlation_matrix(df: pd.DataFrame) -> Dict[str, Dict[str, float]]:
    num_df = df.select_dtypes(include="number")
    if num_df.shape[1] < 2:
        return {}
    corr = num_df.corr().round(4)
    return {
        col: {c: (_safe_float(v) or 0.0) for c, v in row.items()}
        for col, row in corr.to_dict().items()
    }


def _build_charts(
    df: pd.DataFrame,
    stats: DatasetStats,
    task_type: str,
    analysis: AnalysisResult
) -> List[ChartData]:
    charts: List[ChartData] = []
    num_cols = df.select_dtypes(include="number").columns.tolist()

    # 1. Feature Means bar chart
    if num_cols:
        means = {c: _safe_float(df[c].mean()) or 0.0 for c in num_cols[:10]}
        charts.append(ChartData(
            chart_type="bar",
            title="Feature Means Overview",
            x_label="Feature",
            y_label="Mean Value",
            labels=list(means.keys()),
            datasets=[{"name": "Mean", "data": list(means.values()), "color": "#3b82f6"}]
        ))

    # 2. Missing values bar chart
    if stats.missing_per_column:
        missing = {k: v for k, v in stats.missing_per_column.items() if v > 0}
        if missing:
            charts.append(ChartData(
                chart_type="bar",
                title="Missing Values per Column",
                x_label="Column",
                y_label="Missing Count",
                labels=list(missing.keys()),
                datasets=[{"name": "Missing", "data": list(missing.values()), "color": "#ef4444"}]
            ))

    # 3. Outlier counts bar chart
    if stats.outlier_counts:
        outliers = {k: v for k, v in stats.outlier_counts.items() if v > 0}
        if outliers:
            charts.append(ChartData(
                chart_type="bar",
                title="Outlier Counts (IQR Method)",
                x_label="Column",
                y_label="Outlier Count",
                labels=list(outliers.keys()),
                datasets=[{"name": "Outliers", "data": list(outliers.values()), "color": "#f59e0b"}]
            ))

    # 4. Correlation heatmap (as bar chart of top pairs)
    if stats.correlation_matrix and len(num_cols) >= 2:
        pairs = []
        seen = set()
        for c1, row in stats.correlation_matrix.items():
            for c2, val in row.items():
                if c1 != c2 and (c2, c1) not in seen:
                    seen.add((c1, c2))
                    pairs.append((f"{c1}↔{c2}", abs(val or 0)))
        pairs.sort(key=lambda x: x[1], reverse=True)
        top = pairs[:10]
        if top:
            charts.append(ChartData(
                chart_type="bar",
                title="Top Feature Correlations (absolute)",
                x_label="Feature Pair",
                y_label="|Correlation|",
                labels=[p[0] for p in top],
                datasets=[{"name": "Correlation", "data": [p[1] for p in top], "color": "#a855f7"}]
            ))

    # 5. Feature importance chart
    if analysis.feature_importance:
        fi = analysis.feature_importance[:12]
        charts.append(ChartData(
            chart_type="bar",
            title="Feature Importance",
            x_label="Feature",
            y_label="Importance Score",
            labels=[f.feature for f in fi],
            datasets=[{"name": "Importance", "data": [f.importance for f in fi], "color": "#10b981"}]
        ))

    # 6. Model performance comparison
    if analysis.model_results:
        charts.append(ChartData(
            chart_type="bar",
            title="Model Performance Comparison",
            x_label="Model",
            y_label=analysis.model_results[0].metric_name + " (%)" if analysis.model_results else "Score",
            labels=[m.model_name for m in analysis.model_results],
            datasets=[{
                "name": "Score",
                "data": [round(m.value * 100, 2) if m.value <= 1.0 else round(m.value, 2) for m in analysis.model_results],
                "color": "#1d7af3"
            }]
        ))

    # 7. Distribution of first numeric column (histogram-like line)
    if num_cols:
        col = num_cols[0]
        try:
            counts, edges = np.histogram(df[col].dropna(), bins=20)
            bin_labels = [f"{e:.2f}" for e in edges[:-1]]
            charts.append(ChartData(
                chart_type="area",
                title=f"Distribution of '{col}'",
                x_label=col,
                y_label="Frequency",
                labels=bin_labels,
                datasets=[{"name": "Count", "data": counts.tolist(), "color": "#06b6d4"}]
            ))
        except Exception:
            pass

    return charts


# ─────────────────────────────────────────────────────────────
#  ML runners
# ─────────────────────────────────────────────────────────────

def _run_classification(df: pd.DataFrame, target: str) -> AnalysisResult:
    feature_cols = [c for c in df.columns if c != target]
    X = df[feature_cols].copy()
    y = df[target].copy()

    # Encode categoricals
    le_map: Dict[str, LabelEncoder] = {}
    for col in X.select_dtypes(include="object").columns:
        le = LabelEncoder()
        X[col] = le.fit_transform(X[col].astype(str))
        le_map[col] = le

    if y.dtype == "object":
        le_y = LabelEncoder()
        y = le_y.fit_transform(y.astype(str))

    X = X.fillna(X.median(numeric_only=True))

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    X = pd.DataFrame(X_scaled, columns=X.columns)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    models = [
        ("Random Forest", RandomForestClassifier(n_estimators=100, random_state=42)),
        ("Gradient Boosting", GradientBoostingClassifier(n_estimators=100, random_state=42)),
        ("Logistic Regression", LogisticRegression(max_iter=1000, random_state=42)),
    ]
    if EXTRA_MODELS_AVAILABLE:
        models.extend([
            ("XGBoost", XGBClassifier(n_estimators=100, random_state=42, use_label_encoder=False, eval_metric="logloss")),
            ("LightGBM", LGBMClassifier(n_estimators=100, random_state=42, verbosity=-1)),
            ("CatBoost", CatBoostClassifier(n_estimators=100, random_state=42, verbose=0))
        ])

    model_results: List[ModelMetric] = []
    best_model = None
    best_acc = -1.0
    best_name = ""

    for name, clf in models:
        try:
            clf.fit(X_train, y_train)
            preds = clf.predict(X_test)
            acc = round(accuracy_score(y_test, preds), 4)
            model_results.append(ModelMetric(model_name=name, metric_name="Accuracy", value=acc))
            if acc > best_acc:
                best_acc = acc
                best_model = clf
                best_name = name
        except Exception as e:
            model_results.append(ModelMetric(model_name=name, metric_name="Accuracy", value=0.0,
                                             extra={"error": str(e)}))

    tuning_msg = ""
    if best_acc < 0.89 and best_model is not None and best_name in ["Random Forest", "Gradient Boosting", "XGBoost", "LightGBM"]:
        tuning_msg = f" Initial accuracy {best_acc*100:.1f}% (<89%), triggered hyperparameter tuning on {best_name}."
        param_grid = {}
        if best_name == "Random Forest":
            param_grid = {'n_estimators': [100, 200], 'max_depth': [None, 10, 20]}
        elif best_name == "Gradient Boosting":
            param_grid = {'n_estimators': [100, 200], 'learning_rate': [0.05, 0.1]}
        elif best_name == "XGBoost":
            param_grid = {'n_estimators': [100, 200], 'learning_rate': [0.05, 0.1], 'max_depth': [3, 5]}
        elif best_name == "LightGBM":
            param_grid = {'n_estimators': [100, 200], 'learning_rate': [0.05, 0.1], 'num_leaves': [31, 50]}
        
        if param_grid:
            try:
                grid = GridSearchCV(best_model, param_grid, cv=3, scoring='accuracy', n_jobs=-1)
                grid.fit(X_train, y_train)
                best_model = grid.best_estimator_
                preds = best_model.predict(X_test)
                tuned_acc = round(accuracy_score(y_test, preds), 4)
                if tuned_acc > best_acc:
                    best_acc = tuned_acc
                    for mr in model_results:
                        if mr.model_name == best_name:
                            mr.value = best_acc
                            mr.extra = {"tuned": True, "params": grid.best_params_}
            except Exception:
                pass

    feature_importance: List[FeatureImportance] = []
    if best_model and hasattr(best_model, "feature_importances_"):
        importances = best_model.feature_importances_
        pairs = sorted(zip(feature_cols, importances), key=lambda x: x[1], reverse=True)
        feature_importance = [FeatureImportance(feature=f, importance=round(float(i), 4)) for f, i in pairs[:15]]

    classes = list(set(y_test.tolist() if hasattr(y_test, "tolist") else y_test))
    n_classes = len(classes)

    key_insights = [
        f"Best model: {best_name if best_name else 'N/A'} with accuracy {best_acc*100:.1f}%{tuning_msg}",
        f"Dataset has {len(feature_cols)} features and {n_classes} target classes",
        f"Training set: {len(X_train)} rows | Test set: {len(X_test)} rows",
    ]
    if feature_importance:
        key_insights.append(f"Most important feature: '{feature_importance[0].feature}' (importance={feature_importance[0].importance})")

    recommendations = [
        "Review class imbalance — consider SMOTE or class weighting if accuracy is low.",
        "Feature engineering on top-importance features may boost performance further.",
    ]
    if best_acc < 0.89:
        recommendations.append("Consider collecting more data or trying different algorithms to reach 89% accuracy.")
    else:
        recommendations.append("Hyperparameter tuning (GridSearchCV) was successful or accuracy was high enough.")

    return AnalysisResult(
        task_type="classification",
        task_reason=f"Target '{target}' has categorical values → classification pipeline selected.",
        model_results=model_results,
        feature_importance=feature_importance,
        executive_summary=f"Classification analysis on '{target}': best accuracy {best_acc*100:.1f}% with {len(feature_cols)} features.",
        key_insights=key_insights,
        recommendations=recommendations,
    )


def _run_regression(df: pd.DataFrame, target: str) -> AnalysisResult:
    feature_cols = [c for c in df.columns if c != target]
    X = df[feature_cols].copy()
    y = df[target].copy()

    for col in X.select_dtypes(include="object").columns:
        le = LabelEncoder()
        X[col] = le.fit_transform(X[col].astype(str))

    X = X.fillna(X.median(numeric_only=True))
    y = y.fillna(y.median())

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    X = pd.DataFrame(X_scaled, columns=X.columns)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    models = [
        ("Random Forest", RandomForestRegressor(n_estimators=100, random_state=42)),
        ("Gradient Boosting", GradientBoostingRegressor(n_estimators=100, random_state=42)),
        ("Linear Regression", LinearRegression()),
    ]
    if EXTRA_MODELS_AVAILABLE:
        models.extend([
            ("XGBoost", XGBRegressor(n_estimators=100, random_state=42)),
            ("LightGBM", LGBMRegressor(n_estimators=100, random_state=42, verbosity=-1)),
            ("CatBoost", CatBoostRegressor(n_estimators=100, random_state=42, verbose=0))
        ])

    model_results: List[ModelMetric] = []
    best_model = None
    best_r2 = -999.0
    best_name = ""

    for name, reg in models:
        try:
            reg.fit(X_train, y_train)
            preds = reg.predict(X_test)
            r2 = round(r2_score(y_test, preds), 4)
            mae = round(mean_absolute_error(y_test, preds), 4)
            rmse = round(np.sqrt(mean_squared_error(y_test, preds)), 4)
            model_results.append(ModelMetric(
                model_name=name, metric_name="R²", value=r2,
                extra={"MAE": mae, "RMSE": rmse}
            ))
            if r2 > best_r2:
                best_r2 = r2
                best_model = reg
                best_name = name
        except Exception as e:
            model_results.append(ModelMetric(model_name=name, metric_name="R²", value=0.0,
                                             extra={"error": str(e)}))

    tuning_msg = ""
    if best_r2 < 0.89 and best_r2 > 0 and best_model is not None and best_name in ["Random Forest", "Gradient Boosting", "XGBoost", "LightGBM"]:
        tuning_msg = f" Initial R² was {best_r2:.4f} (<0.89), triggered hyperparameter tuning on {best_name}."
        param_grid = {}
        if best_name == "Random Forest":
            param_grid = {'n_estimators': [100, 200], 'max_depth': [None, 10, 20]}
        elif best_name == "Gradient Boosting":
            param_grid = {'n_estimators': [100, 200], 'learning_rate': [0.05, 0.1]}
        elif best_name == "XGBoost":
            param_grid = {'n_estimators': [100, 200], 'learning_rate': [0.05, 0.1], 'max_depth': [3, 5]}
        elif best_name == "LightGBM":
            param_grid = {'n_estimators': [100, 200], 'learning_rate': [0.05, 0.1], 'num_leaves': [31, 50]}
        
        if param_grid:
            try:
                grid = GridSearchCV(best_model, param_grid, cv=3, scoring='r2', n_jobs=-1)
                grid.fit(X_train, y_train)
                best_model = grid.best_estimator_
                preds = best_model.predict(X_test)
                tuned_r2 = round(r2_score(y_test, preds), 4)
                if tuned_r2 > best_r2:
                    best_r2 = tuned_r2
                    mae = round(mean_absolute_error(y_test, preds), 4)
                    rmse = round(np.sqrt(mean_squared_error(y_test, preds)), 4)
                    for mr in model_results:
                        if mr.model_name == best_name:
                            mr.value = best_r2
                            mr.extra = {"MAE": mae, "RMSE": rmse, "tuned": True, "params": grid.best_params_}
            except Exception:
                pass

    feature_importance: List[FeatureImportance] = []
    if best_model and hasattr(best_model, "feature_importances_"):
        importances = best_model.feature_importances_
        pairs = sorted(zip(feature_cols, importances), key=lambda x: x[1], reverse=True)
        feature_importance = [FeatureImportance(feature=f, importance=round(float(i), 4)) for f, i in pairs[:15]]

    key_insights = [
        f"Best model: {best_name if best_name else 'N/A'} (R² = {best_r2:.4f}, {best_r2*100:.1f}% variance explained){tuning_msg}",
        f"Target range: [{float(y.min()):.2f}, {float(y.max()):.2f}], mean={float(y.mean()):.2f}",
        f"Training set: {len(X_train)} rows | Test set: {len(X_test)} rows",
    ]
    if feature_importance:
        key_insights.append(f"Top predictor: '{feature_importance[0].feature}'")

    best_mr = next((m for m in model_results if m.value == best_r2), None)
    extra_str = ""
    if best_mr and best_mr.extra:
        extra_str = f" (MAE={best_mr.extra.get('MAE', 'N/A')}, RMSE={best_mr.extra.get('RMSE', 'N/A')})"

    recommendations = [
        "Check for multicollinearity among top features using VIF analysis.",
        "Consider polynomial features or interaction terms to improve R².",
        "Validate predictions on out-of-sample data before deploying.",
    ]
    if best_r2 < 0.89:
        recommendations.append("Consider collecting more data or trying different algorithms to reach an R² of 0.89.")
    else:
        recommendations.append("Hyperparameter tuning (GridSearchCV) was successful or R² was high enough.")

    return AnalysisResult(
        task_type="regression",
        task_reason=f"Target '{target}' is continuous numeric → regression pipeline selected.",
        model_results=model_results,
        feature_importance=feature_importance,
        executive_summary=f"Regression on '{target}': best R²={best_r2:.4f}{extra_str}.",
        key_insights=key_insights,
        recommendations=recommendations,
    )


def _run_clustering(df: pd.DataFrame) -> AnalysisResult:
    num_df = df.select_dtypes(include="number").fillna(0)
    if num_df.shape[1] < 2:
        return AnalysisResult(
            task_type="clustering",
            task_reason="Clustering attempted but insufficient numeric features.",
            executive_summary="Not enough numeric columns for clustering.",
            key_insights=[], recommendations=[]
        )

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(num_df)

    # Try k=2..6 and pick best silhouette
    best_k, best_score, best_labels = 2, -1.0, None
    scores = []
    for k in range(2, min(7, len(df))):
        try:
            km = KMeans(n_clusters=k, random_state=42, n_init=10)
            labels = km.fit_predict(X_scaled)
            score = silhouette_score(X_scaled, labels)
            scores.append(ModelMetric(model_name=f"KMeans k={k}", metric_name="Silhouette", value=round(float(score), 4)))
            if score > best_score:
                best_score = score
                best_k = k
                best_labels = labels
        except Exception:
            continue

    key_insights = [
        f"Optimal clusters: k={best_k} (silhouette score={best_score:.4f})",
        f"Dataset has {num_df.shape[1]} numeric features used for clustering",
        f"Total observations: {len(df)}",
    ]
    if best_labels is not None:
        unique, counts = np.unique(best_labels, return_counts=True)
        sizes = ", ".join([f"Cluster {u}: {c} rows" for u, c in zip(unique, counts)])
        key_insights.append(f"Cluster sizes: {sizes}")

    return AnalysisResult(
        task_type="clustering",
        task_reason="No clear target column detected → unsupervised clustering applied.",
        model_results=scores,
        executive_summary=f"KMeans clustering: optimal k={best_k} clusters with silhouette={best_score:.4f}.",
        key_insights=key_insights,
        recommendations=[
            "Visualize clusters with PCA or t-SNE for interpretability.",
            "Profile each cluster by computing feature means per cluster.",
            "Consider DBSCAN for datasets with non-spherical cluster shapes.",
        ]
    )


def _run_time_series(df: pd.DataFrame, date_col: str, target: str) -> AnalysisResult:
    """Simple trend analysis + 5-step ahead naive forecast."""
    try:
        df = df.copy()
        df[date_col] = pd.to_datetime(df[date_col], infer_datetime_format=True, errors="coerce")
        df = df.dropna(subset=[date_col]).sort_values(date_col)

        if target not in df.columns or not pd.api.types.is_numeric_dtype(df[target]):
            return AnalysisResult(
                task_type="time_series",
                task_reason="Time-series detected but target column is non-numeric.",
                executive_summary="Could not run forecasting on non-numeric target.",
                key_insights=[], recommendations=[]
            )

        ts = df[target].dropna()
        mean_val = float(ts.mean())
        std_val = float(ts.std())
        min_val = float(ts.min())
        max_val = float(ts.max())
        trend = "upward" if ts.iloc[-1] > ts.iloc[0] else "downward"
        pct_change = ((ts.iloc[-1] - ts.iloc[0]) / abs(ts.iloc[0]) * 100) if ts.iloc[0] != 0 else 0.0

        # Naive moving-average forecast (5 steps ahead)
        window = min(7, len(ts))
        ma = float(ts.rolling(window).mean().iloc[-1])
        forecast = [{"step": i + 1, "forecast": round(ma, 4)} for i in range(5)]

        return AnalysisResult(
            task_type="time_series",
            task_reason=f"Date column '{date_col}' found → time-series analysis applied.",
            forecast=forecast,
            trend_analysis=f"{trend.capitalize()} trend: {pct_change:.1f}% total change over the series.",
            executive_summary=(
                f"Time-series on '{target}': {trend} trend over {len(ts)} periods. "
                f"Mean={mean_val:.2f}, Std={std_val:.2f}, Range=[{min_val:.2f}, {max_val:.2f}]."
            ),
            key_insights=[
                f"Trend direction: {trend} ({pct_change:+.1f}% from first to last observation)",
                f"Mean: {mean_val:.2f} | Std: {std_val:.2f}",
                f"Min: {min_val:.2f} | Max: {max_val:.2f}",
                f"5-step ahead moving-average forecast: ~{ma:.2f} per step",
            ],
            recommendations=[
                "Apply ARIMA or Prophet for more accurate seasonal forecasting.",
                "Check for seasonality by decomposing the time series.",
                "Ensure no missing timestamps before advanced forecasting.",
            ]
        )
    except Exception as exc:
        return AnalysisResult(
            task_type="time_series",
            task_reason="Time-series detected.",
            executive_summary=f"Time-series analysis failed: {str(exc)}",
            key_insights=[], recommendations=[]
        )


def _run_statistical(df: pd.DataFrame) -> AnalysisResult:
    num_df = df.select_dtypes(include="number")
    key_insights = []

    for col in num_df.columns[:5]:
        s = num_df[col].dropna()
        if len(s) == 0:
            continue
        key_insights.append(
            f"'{col}': mean={s.mean():.2f}, std={s.std():.2f}, "
            f"min={s.min():.2f}, max={s.max():.2f}"
        )

    return AnalysisResult(
        task_type="statistical",
        task_reason="General statistical analysis applied — no clear ML task detected.",
        executive_summary=f"Statistical summary of {df.shape[0]} rows × {df.shape[1]} columns.",
        key_insights=key_insights,
        recommendations=[
            "Identify a target variable to enable predictive ML analysis.",
            "Visualize distributions to check for normality and skewness.",
        ]
    )


# ─────────────────────────────────────────────────────────────
#  Main entry point
# ─────────────────────────────────────────────────────────────

async def process_dataset(file_path: Path) -> FileAnalysisResponse:
    ext = file_path.suffix.lower()
    try:
        df = pd.read_csv(file_path) if ext == ".csv" else pd.read_excel(file_path)
    except Exception as e:
        return FileAnalysisResponse(
            id=str(uuid.uuid4()), filename=file_path.name,
            file_type=ext, size=file_path.stat().st_size,
            summary=f"Failed to read file: {str(e)}"
        )

    num_rows, num_cols = df.shape
    data_types = {col: str(dtype) for col, dtype in df.dtypes.items()}
    missing_per_column = {col: int(df[col].isna().sum()) for col in df.columns}
    total_missing = sum(missing_per_column.values())
    outlier_counts = _detect_outliers(df)
    corr_matrix = _correlation_matrix(df)

    # Preview (first 5 rows)
    preview_df = df.head(5).where(pd.notnull(df.head(5)), None)
    preview_columns = list(df.columns)
    preview_data = preview_df.values.tolist()

    # Numeric summary
    num_df = df.select_dtypes(include="number")
    numeric_summary: Dict[str, Any] = {}
    if not num_df.empty:
        desc = num_df.describe().to_dict()
        for col, stats_d in desc.items():
            numeric_summary[col] = {k: _safe_float(v) for k, v in stats_d.items()}

    stats = DatasetStats(
        rows=num_rows, columns=num_cols, missingValues=total_missing,
        dataTypes=data_types, previewColumns=preview_columns,
        previewData=preview_data, numeric_summary=numeric_summary,
        correlation_matrix=corr_matrix, outlier_counts=outlier_counts,
        missing_per_column=missing_per_column
    )

    # Detect task type
    task_type, task_reason, target = _detect_task_type(df)

    # Run appropriate analysis
    if task_type == "classification" and target:
        analysis = _run_classification(df, target)
    elif task_type == "regression" and target:
        analysis = _run_regression(df, target)
    elif task_type == "clustering":
        analysis = _run_clustering(df)
    elif task_type == "time_series":
        date_cols = [c for c in df.columns if df[c].dtype == "object" and _is_date_column(df[c])]
        date_col = date_cols[0] if date_cols else df.columns[0]
        tgt = target or df.select_dtypes(include="number").columns[-1] if not df.select_dtypes(include="number").empty else df.columns[-1]
        analysis = _run_time_series(df, date_col, tgt)
    else:
        analysis = _run_statistical(df)

    # Build charts
    charts = _build_charts(df, stats, task_type, analysis)

    # Build AI executive summary via Gemini
    stats_summary = {
        "rows": num_rows, "cols": num_cols, "missing": total_missing,
        "task_type": task_type, "task_reason": task_reason,
        "numeric_summary": {k: {sk: sv for sk, sv in v.items() if sk in ("mean", "std", "min", "max")}
                            for k, v in numeric_summary.items()},
        "top_outlier_cols": {k: v for k, v in outlier_counts.items() if v > 0},
        "analysis_insights": analysis.key_insights,
        "model_results": [{"model": m.model_name, "score": m.value} for m in (analysis.model_results or [])],
    }
    from app.services.llm_service import generate_dataset_insight
    ai_summary = generate_dataset_insight(json.dumps(stats_summary, indent=2), file_path.name)
    analysis.executive_summary = ai_summary if ai_summary else analysis.executive_summary

    summary_text = (
        f"Dataset: {num_rows} rows × {num_cols} columns | "
        f"Task: {task_type.replace('_', ' ').title()} | "
        f"Missing values: {total_missing}"
    )

    return FileAnalysisResponse(
        id=str(uuid.uuid4()),
        filename=file_path.name,
        file_type=ext,
        size=file_path.stat().st_size,
        summary=summary_text,
        stats=stats,
        analysis=analysis,
        charts=charts,
        key_findings=analysis.key_insights[:3] if analysis.key_insights else []
    )
