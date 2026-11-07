"""Dynamic NLP Pipeline orchestrator.

Executes user-selected preprocessing steps in any custom sequence order,
and supports step-by-step intermediate tracing for the live UI playground.
"""

from typing import Any, Dict, List, Optional, Union
from .nlp_steps import (
    clean_tags,
    lemmatize_tokens,
    normalize_text,
    remove_stopwords,
    stem_tokens,
    tokenize,
)


AVAILABLE_STEPS: List[Dict[str, Any]] = [
    {
        "id": "tag_cleaning",
        "name": "Tag Cleaning",
        "description": "Strips SGML/XML tags (<...>) and decodes entities.",
        "default_enabled": True,
    },
    {
        "id": "normalisation",
        "name": "Normalisation",
        "description": "Lowercases, removes punctuation, normalizes whitespace and tokenizes.",
        "default_enabled": True,
    },
    {
        "id": "stopwords_removal",
        "name": "Stopwords Removal",
        "description": "Filters out high-frequency functional English words.",
        "default_enabled": True,
    },
    {
        "id": "stemming",
        "name": "Stemming",
        "description": "Rule-based suffix stripping (Porter-style).",
        "default_enabled": True,
    },
    {
        "id": "lemmatization",
        "name": "Lemmatization",
        "description": "Reduces words to base forms using irregular dictionary and morphological rules.",
        "default_enabled": False,
    },
]

DEFAULT_STEP_ORDER: List[str] = [
    "tag_cleaning",
    "normalisation",
    "stopwords_removal",
    "stemming",
]

STEP_NAMES: Dict[str, str] = {step["id"]: step["name"] for step in AVAILABLE_STEPS}


def _ensure_tokens(data: Union[str, List[str]]) -> List[str]:
    """Converts string data into whitespace-separated tokens without forcing normalization."""
    if isinstance(data, list):
        return data
    return [tok for tok in data.split() if tok]


def _format_trace_entry(
    step_id: str,
    step_name: str,
    data: Union[str, List[str]],
) -> Dict[str, Any]:
    """Formats an intermediate pipeline output for UI visualization."""
    if isinstance(data, list):
        preview = " ".join(data[:20]) + ("..." if len(data) > 20 else "")
        data_type = "tokens"
    else:
        preview = data[:200] + ("..." if len(data) > 200 else "")
        data_type = "string"

    return {
        "step_id": step_id,
        "step_name": step_name,
        "type": data_type,
        "output": data,
        "preview": preview,
        "count": len(data),
    }


class DynamicNLPPipeline:
    """Configurable NLP pipeline with arbitrary step selection and ordering."""

    def __init__(self, step_order: Optional[List[str]] = None):
        if step_order is None:
            self.step_order = list(DEFAULT_STEP_ORDER)
        else:
            self.step_order = [step for step in step_order if step in STEP_NAMES]

    def process(self, text: str) -> List[str]:
        """Runs all enabled steps in order and returns the final list of tokens."""
        data: Union[str, List[str]] = text
        for step_id in self.step_order:
            data = self._apply_step(step_id, data)

        tokens = _ensure_tokens(data)
        return [tok.strip() for tok in tokens if tok.strip()]

    def trace(self, text: str) -> List[Dict[str, Any]]:
        """Executes the pipeline while recording output snapshots after each step."""
        history: List[Dict[str, Any]] = [
            _format_trace_entry("input", "Input Raw Text", text)
        ]

        data: Union[str, List[str]] = text
        for step_id in self.step_order:
            data = self._apply_step(step_id, data)
            step_name = STEP_NAMES.get(step_id, step_id)
            history.append(_format_trace_entry(step_id, step_name, data))

        return history

    def _apply_step(
        self,
        step_id: str,
        data: Union[str, List[str]],
    ) -> Union[str, List[str]]:
        """Applies a single preprocessing step while handling string/token transitions."""
        if step_id == "tag_cleaning":
            if isinstance(data, list):
                return [t for t in (clean_tags(tok) for tok in data) if t]
            return clean_tags(data)

        if step_id == "normalisation":
            raw_text = " ".join(data) if isinstance(data, list) else data
            return tokenize(normalize_text(raw_text))

        if step_id == "stopwords_removal":
            return remove_stopwords(_ensure_tokens(data))

        if step_id == "stemming":
            return stem_tokens(_ensure_tokens(data))

        if step_id == "lemmatization":
            return lemmatize_tokens(_ensure_tokens(data))

        return data

    def to_dict(self) -> Dict[str, Any]:
        return {
            "step_order": self.step_order,
            "all_available_steps": AVAILABLE_STEPS,
        }
