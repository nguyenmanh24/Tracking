"""
CONSTRUCTION PAYMENT TRACKER - FASTAPI BACKEND SERVER
Serves static frontend files and exposes APIs for calculations and Excel reporting.
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

from .calculator import (
    calculate_boq_summary,
    calculate_milestone_financials
)
from .excel_exporter import export_project_excel

app = FastAPI(title="Construction Payment Tracker API", version="1.0.0")

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "Construction Payment Tracker Pro"}

@app.post("/api/calculate-milestone")
def api_calculate_milestone(payload: Dict[str, Any]):
    project_info = payload.get("info", {})
    milestones = payload.get("milestones", [])
    active_ms = payload.get("activeMilestone", {})
    boq = payload.get("boqItems", [])
    
    result = calculate_milestone_financials(project_info, milestones, active_ms, boq)
    return result

@app.post("/api/export-excel")
def api_export_excel(payload: Dict[str, Any]):
    project = payload.get("project", {})
    active_ms_id = payload.get("activeMilestoneId")
    out_dir = os.path.join(BASE_DIR, "exports")
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, "BaoCaoThanhToan_Python.xlsx")
    export_project_excel(project, out_file, active_ms_id)
    return FileResponse(out_file, filename="BaoCaoThanhToan.xlsx", media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

# Mount static frontend
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

def start_server(port: int = 8000, host: str = "127.0.0.1"):
    import uvicorn
    uvicorn.run("backend.main:app", host=host, port=port, reload=True)

if __name__ == "__main__":
    start_server()
