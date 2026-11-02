"""Dynamic NLP Pipeline orchestrator.
Allows enabling/disabling steps AND executing them in arbitrary user-defined order.
"""

from typing import Any, Dict, List, Union
from .nlp_steps import (
    clean_tags,
    normalize_text,
    tokenize,
    remove_stopwords,
    stem_tokens,
    lemmatize_tokens,
    DEFAULT_STOPWORDS
)


AVAILABLE_STEPS = [
    {
        "id": "tag_cleaning",
        "name": "Tag Cleaning",
        "description": "Strips SGML/XML tags (<...>) and decodes entities.",
        "default_enabled": True
    },
    {
        "id": "normalisation",
        "name": "Normalisation",
        "description": "Lowercases, removes punctuation, normalizes whitespace and tokenizes.",
        "default_enabled": True
    },
    {
        "id": "stopwords_removal",
        "name": "Stopwords Removal",
        "description": "Filters out high-frequency functional English words.",
        "default_enabled": True
    },
    {
        "id": "stemming",
        "name": "Stemming",
        "description": "Rule-based suffix stripping (Porter-style).",
        "default_enabled": True
    },
    {
        "id": "lemmatization",
        "name": "Lemmatization",
        "description": "Reduces words to base forms using irregular dictionary and morphological rules.",
        "default_enabled": False
    }
]


class DynamicNLPPipeline:
    """
    Orchestrates the NLP pipeline dynamically according to user configuration:
    - Custom selection of steps
    - Custom execution order
    """

    def __init__(self, step_order: List[str] = None):
        """
        step_order: ordered list of step IDs to execute.
        If None, uses default 5-step order.
        """
        if step_order is None:
            self.step_order = [
                "tag_cleaning",
                "normalisation",
                "stopwords_removal",
                "stemming"
            ]
        else:
            self.step_order = [s for s in step_order if s in [st["id"] for st in AVAILABLE_STEPS]]

    def process(self, text: str) -> List[str]:
        """
        Processes an input raw text string through the active pipeline steps in order.
        Returns final list of tokens.
        """
        current_data: Union[str, List[str]] = text

        for step_id in self.step_order:
            current_data = self._apply_step(step_id, current_data)

        # Guarantee final output is a list of string tokens
        if isinstance(current_data, str):
            return tokenize(normalize_text(current_data))
        return [str(t) for t in current_data if str(t).strip()]

    def trace(self, text: str) -> List[Dict[str, Any]]:
        """
        Runs the pipeline while recording intermediate outputs after each step.
        Used for the interactive live preview in the Admin UI.
        """
        trace_history = []
        current_data: Union[str, List[str]] = text

        trace_history.append({
            "step_id": "input",
            "step_name": "Input Raw Text",
            "type": "string",
            "output": text,
            "preview": text[:200] + ("..." if len(text) > 200 else ""),
            "count": len(text)
        })

        for step_id in self.step_order:
            current_data = self._apply_step(step_id, current_data)
            
            step_meta = next((s for s in AVAILABLE_STEPS if s["id"] == step_id), {"name": step_id})
            is_tokens = isinstance(current_data, list)

            trace_history.append({
                "step_id": step_id,
                "step_name": step_meta.get("name", step_id),
                "type": "tokens" if is_tokens else "string",
                "output": current_data if is_tokens else current_data,
                "preview": " ".join(current_data[:20]) + ("..." if is_tokens and len(current_data) > 20 else "")
                           if is_tokens else (current_data[:200] + ("..." if len(current_data) > 200 else "")),
                "count": len(current_data)
            })

        return trace_history

    def _apply_step(self, step_id: str, data: Union[str, List[str]]) -> Union[str, List[str]]:
        """Executes a single step ensuring type compatibility."""
        if step_id == "tag_cleaning":
            if isinstance(data, list):
                # If already tokens, clean each string
                return [clean_tags(t) for t in data]
            return clean_tags(data)

        elif step_id == "normalisation":
            if isinstance(data, list):
                # If already tokens, normalize each and re-tokenize
                merged = " ".join(data)
                return tokenize(normalize_text(merged))
            # Text -> normalized tokens
            return tokenize(normalize_text(data))

        elif step_id == "stopwords_removal":
            tokens = data if isinstance(data, list) else tokenize(normalize_text(data))
            return remove_stopwords(tokens)

        elif step_id == "stemming":
            tokens = data if isinstance(data, list) else tokenize(normalize_text(data))
            return stem_tokens(tokens)

        elif step_id == "lemmatization":
            tokens = data if isinstance(data, list) else tokenize(normalize_text(data))
            return lemmatize_tokens(tokens)

        return data

    def to_dict(self) -> Dict[str, Any]:
        return {
            "step_order": self.step_order,
            "all_available_steps": AVAILABLE_STEPS
        }

