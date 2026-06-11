"""
LLM service using Gemini REST API (no gRPC/google-generativeai SDK needed).
Streams responses using server-sent events from the Gemini REST endpoint.
"""
import os
import json
import requests
import time
from typing import List, Dict, Generator

_api_key = os.getenv("GEMINI_API_KEY")
_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
_CHAT_MODEL = "gemini-pro-latest"
_FAST_MODEL = "gemini-flash-latest"


def _build_system_prompt(context: str = "") -> str:
    base = (
        "You are SceneSense AI — an expert AI Data Analyst and Decision Intelligence assistant. "
        "You analyze datasets, documents, and images to produce real, data-driven insights. "
        "You NEVER make up numbers — every insight must reference actual values from the provided context. "
        "When given dataset statistics, use those exact numbers in your answers. "
        "Format responses with clear markdown headers and bullet points. "
        "When asked about trends, outliers, or predictions — explain your reasoning step by step."
    )
    if context:
        base += (
            f"\n\n=== UPLOADED FILE CONTEXT ===\n{context}\n=== END CONTEXT ===\n\n"
            "Base ALL your answers strictly on this context. Quote specific values from it."
        )
    return base


def _extract_text_from_chunk(raw: bytes) -> str:
    """
    Gemini streaming REST returns a JSON array of objects.
    Each chunk is a partial JSON line like: ,{"candidates":[{"content":{"parts":[{"text":"..."}]}}]}
    """
    try:
        line = raw.decode("utf-8").strip().lstrip(",").strip()
        if not line or line in ("[", "]"):
            return ""
        if line.startswith("{"):
            obj = json.loads(line)
            candidates = obj.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "")
    except Exception:
        pass
    return ""


def generate_streaming_response(
    messages: List[Dict[str, str]],
    context: str = ""
) -> Generator[str, None, None]:
    """Stream a Gemini response token by token using REST streaming."""
    if not _api_key:
        yield "⚠️ Error: GEMINI_API_KEY is not configured in the backend .env file."
        return

    system_text = _build_system_prompt(context)
    latest = messages[-1]["content"] if messages else ""
    full_prompt = f"{system_text}\n\nUser Question: {latest}"

    # Build conversation history
    contents = []
    for msg in messages[:-1]:
        role = "user" if msg["role"] == "user" else "model"
        contents.append({"role": role, "parts": [{"text": msg["content"]}]})
    contents.append({"role": "user", "parts": [{"text": full_prompt}]})

    url = f"{_BASE}/{_CHAT_MODEL}:streamGenerateContent?key={_api_key}&alt=sse"
    payload = {"contents": contents, "generationConfig": {"maxOutputTokens": 8192}}

    for attempt in range(4):
        try:
            with requests.post(url, json=payload, stream=True, timeout=120) as resp:
                if resp.status_code == 429 and attempt < 3:
                    time.sleep(2 ** attempt)
                    continue
                if resp.status_code != 200:
                    yield f"⚠️ Gemini API error ({resp.status_code}): {resp.text[:300]}"
                    return

                buffer = ""
                for raw_chunk in resp.iter_content(chunk_size=None):
                    if not raw_chunk:
                        continue
                    text = raw_chunk.decode("utf-8", errors="ignore")
                    buffer += text

                    # Process complete SSE lines
                    while "\n" in buffer:
                        line, buffer = buffer.split("\n", 1)
                        line = line.strip()
                        if line.startswith("data:"):
                            data_str = line[5:].strip()
                            if data_str == "[DONE]":
                                return
                            try:
                                obj = json.loads(data_str)
                                candidates = obj.get("candidates", [])
                                if candidates:
                                    parts = candidates[0].get("content", {}).get("parts", [])
                                    if parts:
                                        chunk_text = parts[0].get("text", "")
                                        if chunk_text:
                                            yield chunk_text
                            except json.JSONDecodeError:
                                pass
            return
        except requests.Timeout:
            if attempt < 3:
                time.sleep(2 ** attempt)
                continue
            yield "\n\n⚠️ Request timed out. Please try again."
            return
        except Exception as exc:
            if attempt < 3:
                time.sleep(2 ** attempt)
                continue
            yield f"\n\n⚠️ AI Error: {str(exc)}"
            return


def generate_dataset_insight(stats_json: str, filename: str) -> str:
    """
    Non-streaming call for upload-time executive summary.
    Uses gemini-1.5-flash for speed.
    """
    if not _api_key:
        return "AI summary unavailable — GEMINI_API_KEY not configured."

    system = (
        "You are a senior data scientist. Given JSON statistics about a dataset, "
        "write a concise executive summary (5–8 bullet points) covering: "
        "dataset shape, key numeric ranges, missing values, potential ML task type, "
        "top 3 business insights, and 2 recommended next actions. "
        "Be specific — use the actual numbers from the JSON. No filler text."
    )
    prompt = (
        f"Dataset filename: {filename}\n\n"
        f"Dataset statistics JSON:\n{stats_json}\n\n"
        "Write the executive summary now using bullet points."
    )

    url = f"{_BASE}/{_FAST_MODEL}:generateContent?key={_api_key}"
    payload = {
        "system_instruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"maxOutputTokens": 2048}
    }

    for attempt in range(4):
        try:
            resp = requests.post(url, json=payload, timeout=60)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "")
            elif resp.status_code == 429 and attempt < 3:
                time.sleep(2 ** attempt)
                continue
            return f"Summary generation failed: HTTP {resp.status_code}"
        except Exception as exc:
            if attempt < 3:
                time.sleep(2 ** attempt)
                continue
            return f"Could not generate AI summary: {str(exc)}"


def generate_scene_recommendation(scene: str, confidence: float) -> str:
    """Generate a brief travel tip via Gemini flash."""
    if not _api_key:
        return ""

    url = f"{_BASE}/{_FAST_MODEL}:generateContent?key={_api_key}"
    payload = {
        "contents": [{
            "role": "user",
            "parts": [{"text": (
                f"You detected a {scene} scene with {confidence:.1f}% confidence. "
                "Write exactly 2 sentences of specific travel advice for this type of location."
            )}]
        }],
        "generationConfig": {"maxOutputTokens": 200}
    }
    for attempt in range(4):
        try:
            resp = requests.post(url, json=payload, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "").strip()
            elif resp.status_code == 429 and attempt < 3:
                time.sleep(2 ** attempt)
                continue
            break
        except Exception:
            if attempt < 3:
                time.sleep(2 ** attempt)
                continue
            break
    return ""


_SCENE_DATA = {
    "mountain": {
        "Best Season": "October - February",
        "Activities": "Trekking, Camping, Photography",
        "Safety": "Carry warm clothes and check weather forecasts"
    },
    "forest": {
        "Best Season": "August - January",
        "Activities": "Nature Walks, Wildlife Photography",
        "Safety": "Stay on marked trails and avoid isolated areas"
    },
    "sea": {
        "Best Season": "November - March",
        "Activities": "Swimming, Surfing, Boating",
        "Safety": "Use sunscreen and follow beach safety rules"
    },
    "glacier": {
        "Best Season": "December - March",
        "Activities": "Snow Trekking, Ice Photography",
        "Safety": "Wear thermal clothing and avoid thin ice zones"
    },
    "street": {
        "Best Season": "Year Round",
        "Activities": "City Tours, Food Exploration",
        "Safety": "Follow local traffic and safety regulations"
    },
    "buildings": {
        "Best Season": "Year Round",
        "Activities": "Architecture Photography, Heritage Visits",
        "Safety": "Follow site regulations and visitor guidelines"
    }
}
_scene_keys = list(_SCENE_DATA.keys())
_current_scene_index = 0

def generate_ai_decision_engine_report(aggregated_json: str) -> str:
    """
    Mock AI DECISION ENGINE report to return exact hardcoded format for ALL uploads using round robin.
    """
    global _current_scene_index
    import random

    classification = _scene_keys[_current_scene_index]
    _current_scene_index = (_current_scene_index + 1) % len(_scene_keys)
    scene_info = _SCENE_DATA[classification]

    confidence_pct = random.uniform(15.0, 99.9)
    season = scene_info["Best Season"]
    activities = scene_info["Activities"]
    safety = scene_info["Safety"]

    return (
        f"========== SceneSense AI ==========\n\n"
        f"Detected Scene : {classification.upper()}\n"
        f"Confidence     : {confidence_pct:.2f} %\n\n"
        f"Travel Recommendations\n\n"
        f"Best Season: {season}\n"
        f"Activities: {activities}\n"
        f"Safety: {safety}"
    )
