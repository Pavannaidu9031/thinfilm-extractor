"""Schema template system: list/load templates, build JSON schemas from them,
and create new templates without editing code.

A template is a JSON file in backend/templates/ describing what one extracted
record looks like for a given research area (thin films, catalysis, cell
assays, ...). The extraction JSON schema is generated from the template, so
defining a new research area never requires code changes.
"""

import json
import re
from copy import deepcopy
from pathlib import Path

TEMPLATES_DIR = Path(__file__).parent / "templates"
DEFAULT_TEMPLATE = "thin_film_deposition"

ALLOWED_FIELD_TYPES = {"string", "number", "integer", "boolean"}
NAME_RE = re.compile(r"^[a-z][a-z0-9_]{0,63}$")

# Paper-metadata fields have fixed shapes; templates choose which to include.
PAPER_FIELD_SHAPES = {
    "title": {"type": ["string", "null"]},
    "authors": {"type": "array", "items": {"type": "string"}},
    "journal": {"type": ["string", "null"]},
    "year": {"type": ["integer", "null"]},
    "doi": {"type": ["string", "null"]},
}

MEASURED_PROPERTY = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "value": {"type": "string"},
        "unit": {"type": ["string", "null"]},
    },
    "required": ["name", "value", "unit"],
    "additionalProperties": False,
}


def list_templates(templates_dir: str | Path = TEMPLATES_DIR) -> list[dict]:
    """Summaries of every available template."""
    out = []
    for path in sorted(Path(templates_dir).glob("*.json")):
        template = json.loads(path.read_text(encoding="utf-8"))
        out.append(
            {
                "name": template["name"],
                "display_name": template.get("display_name", template["name"]),
                "description": template.get("description", ""),
                "field_count": len(template.get("fields", [])),
            }
        )
    return out


def load_template(name: str, templates_dir: str | Path = TEMPLATES_DIR) -> dict:
    if not NAME_RE.match(name or ""):
        raise ValueError(f"Invalid template name: {name!r}")
    path = Path(templates_dir) / f"{name}.json"
    if not path.exists():
        raise FileNotFoundError(f"Unknown template: {name!r}")
    return json.loads(path.read_text(encoding="utf-8"))


def field_labels(template: dict) -> list[tuple[str, str]]:
    """(field_name, human label) pairs for a template, for exports/UI."""
    out = []
    for field in template.get("fields", []):
        label = field.get("label") or field["name"].replace("_", " ").capitalize()
        out.append((field["name"], label))
    return out


def build_schema(template: dict) -> dict:
    """Generate the extraction JSON schema for a template.

    Structured outputs require additionalProperties: false everywhere and all
    properties required; optional values are expressed as nullable types.
    """
    paper_props = {}
    for key in template.get("paper_fields", list(PAPER_FIELD_SHAPES)):
        paper_props[key] = deepcopy(PAPER_FIELD_SHAPES[key])

    sample_props = {}
    for field in template.get("fields", []):
        if field.get("nullable", True):
            sample_props[field["name"]] = {"type": [field["type"], "null"]}
        else:
            sample_props[field["name"]] = {"type": field["type"]}
    if template.get("include_other_properties", True):
        sample_props["other_properties"] = {
            "type": "array",
            "items": deepcopy(MEASURED_PROPERTY),
        }

    return {
        "type": "object",
        "properties": {
            "paper": {
                "type": "object",
                "properties": paper_props,
                "required": list(paper_props),
                "additionalProperties": False,
            },
            "samples": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": sample_props,
                    "required": list(sample_props),
                    "additionalProperties": False,
                },
            },
            "notes": {"type": ["string", "null"]},
        },
        "required": ["paper", "samples", "notes"],
        "additionalProperties": False,
    }


def build_system_prompt(template: dict, schema: dict) -> str:
    """Extraction instructions for a template, mirroring the original
    thin-film prompt but parameterized by the template's fields."""
    record_label = template.get("record_label", "record")
    context = template.get(
        "extraction_context",
        "You are a scientific data extraction assistant for quantitative, "
        "lab-based research papers. You will be given the full text of a "
        f"research paper. Extract the paper metadata and every distinct "
        f"experimental {record_label} described in the paper.",
    )
    include_other = template.get("include_other_properties", True)
    # Some templates (e.g. literature-tracking tables) use a sentinel string like
    # "NR" for unreported fields instead of null; default remains null.
    unreported = template.get("unreported_value")

    field_lines = "\n".join(
        f"- {field['name']} ({field['type']}): {field.get('description', '')}".rstrip()
        for field in template.get("fields", [])
    )
    if not field_lines:
        field_lines = (
            "- (no named fields defined; report every measurement in other_properties)"
            if include_other
            else "- (no named fields defined)"
        )

    if unreported:
        missing_rule = (
            f'- Only report values explicitly stated in the paper. For any field the\n'
            f'  paper does not report, use the exact string "{unreported}" — never null,\n'
            f'  never a guess. Every field must be present as a string.'
        )
    else:
        missing_rule = (
            "- Only report values explicitly stated in the paper; use null for anything not\n"
            "  reported. Never guess or hallucinate values."
        )

    rules = [
        "- Output ONLY valid JSON that matches the schema below exactly — no markdown,",
        "  no code fences, no commentary.",
        "- Extract only the fields defined in the schema.",
        missing_rule,
        "- Convert units where needed so numeric values match the units given in the",
        "  field descriptions.",
    ]
    if include_other:
        rules.append(
            f"- Put measurements that don't fit the named fields into other_properties."
        )
    rules.append(
        "- Use the notes field for anything important that doesn't fit the schema (e.g."
    )
    rules.append(f"  ranges, {record_label} series, or ambiguities in the paper).")

    return (
        f"{context}\n\nRules:\n" + "\n".join(rules) +
        f"\n\nField guide (one {record_label} per entry in `samples`):\n{field_lines}" +
        f"\n\nJSON schema your output must match:\n{json.dumps(schema, indent=2)}\n"
    )


def create_template(spec: dict, templates_dir: str | Path = TEMPLATES_DIR) -> dict:
    """Create a new template from a plain spec — no code editing required.

    Expected spec: {"name": "slug", "display_name": "...", "description": "...",
    "fields": [{"name": ..., "type": ..., "description": ..., "nullable": bool}, ...],
    "paper_fields": [...], "record_label": "...", "include_other_properties": bool}
    Only "name" and "fields" are required.
    """
    name = spec.get("name")
    if not isinstance(name, str) or not NAME_RE.match(name):
        raise ValueError(
            "Template name must be a slug: lowercase letters, digits and "
            "underscores, starting with a letter (e.g. 'battery_cycling')."
        )

    fields = spec.get("fields")
    if not isinstance(fields, list):
        raise ValueError("'fields' must be a list of field definitions.")
    seen = set()
    normalized_fields = []
    for field in fields:
        if not isinstance(field, dict):
            raise ValueError("Each field must be an object.")
        fname = field.get("name")
        ftype = field.get("type")
        if not isinstance(fname, str) or not NAME_RE.match(fname):
            raise ValueError(f"Invalid field name: {fname!r} (use snake_case slugs).")
        if fname in seen or fname == "other_properties":
            raise ValueError(f"Duplicate or reserved field name: {fname!r}")
        if ftype not in ALLOWED_FIELD_TYPES:
            raise ValueError(
                f"Field {fname!r} has invalid type {ftype!r} "
                f"(allowed: {sorted(ALLOWED_FIELD_TYPES)})."
            )
        seen.add(fname)
        normalized = {"name": fname, "type": ftype}
        if field.get("nullable") is False:
            normalized["nullable"] = False
        if field.get("description"):
            normalized["description"] = str(field["description"])
        if field.get("label"):
            normalized["label"] = str(field["label"])
        normalized_fields.append(normalized)

    paper_fields = spec.get("paper_fields", list(PAPER_FIELD_SHAPES))
    bad = [p for p in paper_fields if p not in PAPER_FIELD_SHAPES]
    if bad or not paper_fields:
        raise ValueError(
            f"paper_fields must be a non-empty subset of {list(PAPER_FIELD_SHAPES)}; got {bad or paper_fields}."
        )

    template = {
        "name": name,
        "display_name": spec.get("display_name") or name.replace("_", " ").capitalize(),
        "description": spec.get("description", ""),
        "record_label": spec.get("record_label", "record"),
        "paper_fields": list(paper_fields),
        "include_other_properties": bool(spec.get("include_other_properties", True)),
        "fields": normalized_fields,
    }
    if spec.get("extraction_context"):
        template["extraction_context"] = str(spec["extraction_context"])

    build_schema(template)  # sanity: must produce a valid schema shape

    path = Path(templates_dir) / f"{name}.json"
    if path.exists():
        raise FileExistsError(f"Template {name!r} already exists.")
    path.write_text(json.dumps(template, indent=2) + "\n", encoding="utf-8")
    return template
