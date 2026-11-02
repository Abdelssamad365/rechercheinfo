"""Pipeline configuration and interactive live-preview routes.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from core.pipeline import DynamicNLPPipeline, AVAILABLE_STEPS
from state import state


router = APIRouter(prefix="/api/pipeline", tags=["Pipeline"])


class PipelineConfigReq(BaseModel):
    step_order: List[str]


class PipelinePreviewReq(BaseModel):
    text: str
    step_order: Optional[List[str]] = None


@router.get("/steps")
def get_available_steps():
    """Returns list of available NLP pipeline steps with descriptions and default statuses."""
    return {
        "available_steps": AVAILABLE_STEPS,
        "current_order": state.active_pipeline.step_order
    }


@router.post("/preview")
def preview_pipeline(req: PipelinePreviewReq):
    """
    Simulates the NLP pipeline on custom text and returns a step-by-step trace.
    Shows the exact transformation of text after each step in the user's defined order.
    """
    step_order = req.step_order or state.active_pipeline.step_order
    pipeline = DynamicNLPPipeline(step_order)
    trace_steps = pipeline.trace(req.text)
    final_tokens = pipeline.process(req.text)

    return {
        "status": "success",
        "step_order": step_order,
        "input_text": req.text,
        "trace": trace_steps,
        "final_tokens": final_tokens,
        "final_token_count": len(final_tokens)
    }

