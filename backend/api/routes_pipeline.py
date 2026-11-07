"""NLP pipeline configuration and live trace preview endpoints (`/api/pipeline`)."""

from typing import List, Optional
from fastapi import APIRouter
from pydantic import BaseModel
from core.pipeline import AVAILABLE_STEPS, DynamicNLPPipeline
from state import state


router = APIRouter(prefix="/api/pipeline", tags=["Pipeline"])


class PipelinePreviewReq(BaseModel):
    text: str
    step_order: Optional[List[str]] = None


@router.get("/steps")
def get_available_steps():
    """Returns all available NLP stages and the currently active step sequence."""
    return {
        "available_steps": AVAILABLE_STEPS,
        "current_order": state.active_pipeline.step_order,
    }


@router.post("/preview")
def preview_pipeline(req: PipelinePreviewReq):
    """Runs the NLP pipeline on sample text and returns step-by-step intermediate outputs."""
    step_order = req.step_order if req.step_order is not None else state.active_pipeline.step_order
    pipeline = DynamicNLPPipeline(step_order)

    trace_steps = pipeline.trace(req.text)
    final_tokens = pipeline.process(req.text)

    return {
        "status": "success",
        "step_order": pipeline.step_order,
        "input_text": req.text,
        "trace": trace_steps,
        "final_tokens": final_tokens,
        "final_token_count": len(final_tokens),
    }
