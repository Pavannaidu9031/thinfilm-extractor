"""JSON schema for data extracted from thin-film research papers.

This schema is passed to the Claude API as a structured-output format
(output_config.format), which guarantees the response is valid JSON matching
this shape. Structured outputs require additionalProperties: false on every
object and every property listed in required; fields that may be absent from
a paper are typed as nullable instead of optional.
"""


def _nullable(json_type: str) -> dict:
    return {"type": [json_type, "null"]}


PAPER_METADATA = {
    "type": "object",
    "properties": {
        "title": _nullable("string"),
        "authors": {"type": "array", "items": {"type": "string"}},
        "journal": _nullable("string"),
        "year": _nullable("integer"),
        "doi": _nullable("string"),
    },
    "required": ["title", "authors", "journal", "year", "doi"],
    "additionalProperties": False,
}

MEASURED_PROPERTY = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "value": {"type": "string"},
        "unit": _nullable("string"),
    },
    "required": ["name", "value", "unit"],
    "additionalProperties": False,
}

SAMPLE = {
    "type": "object",
    "properties": {
        "material": {"type": "string"},
        "substrate": _nullable("string"),
        "deposition_method": _nullable("string"),
        "deposition_temperature_c": _nullable("number"),
        "annealing_temperature_c": _nullable("number"),
        "thickness_nm": _nullable("number"),
        "bandgap_ev": _nullable("number"),
        "resistivity_ohm_cm": _nullable("number"),
        "transmittance_percent": _nullable("number"),
        "other_properties": {"type": "array", "items": MEASURED_PROPERTY},
    },
    "required": [
        "material",
        "substrate",
        "deposition_method",
        "deposition_temperature_c",
        "annealing_temperature_c",
        "thickness_nm",
        "bandgap_ev",
        "resistivity_ohm_cm",
        "transmittance_percent",
        "other_properties",
    ],
    "additionalProperties": False,
}

THINFILM_SCHEMA = {
    "type": "object",
    "properties": {
        "paper": PAPER_METADATA,
        "samples": {"type": "array", "items": SAMPLE},
        "notes": _nullable("string"),
    },
    "required": ["paper", "samples", "notes"],
    "additionalProperties": False,
}
