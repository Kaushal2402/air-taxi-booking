from __future__ import annotations

from typing import Any

# Registry: primary_region → entity_type → list of {key, label, requires_expiry}
# "default" is the fallback for any region not explicitly listed.
_REGISTRY: dict[str, dict[str, list[dict[str, Any]]]] = {
    "India": {
        "driver": [
            {"key": "aadhaar",   "label": "Aadhaar Card",       "requires_expiry": False},
            {"key": "pan",       "label": "PAN Card",            "requires_expiry": False},
            {"key": "license",   "label": "Driving Licence",     "requires_expiry": True},
            {"key": "rc",        "label": "Vehicle RC",          "requires_expiry": True},
            {"key": "insurance", "label": "Insurance",           "requires_expiry": True},
            {"key": "permit",    "label": "Permit",              "requires_expiry": True},
            {"key": "photo",     "label": "Profile Photo",       "requires_expiry": False},
            {"key": "badge",     "label": "Driver Badge",        "requires_expiry": True},
        ],
        "vehicle": [
            {"key": "rc",        "label": "Registration (RC)",   "requires_expiry": True},
            {"key": "insurance", "label": "Insurance",           "requires_expiry": True},
            {"key": "permit",    "label": "Permit",              "requires_expiry": True},
            {"key": "fitness",   "label": "Fitness Certificate", "requires_expiry": True},
            {"key": "puc",       "label": "PUC Certificate",     "requires_expiry": True},
        ],
        "operator": [
            {"key": "company_registration", "label": "Company Registration", "requires_expiry": False},
            {"key": "nsop_cert",            "label": "NSOP Certificate",     "requires_expiry": True},
            {"key": "insurance",            "label": "Insurance",            "requires_expiry": True},
            {"key": "other",                "label": "Other",                "requires_expiry": False},
        ],
    },
    "UAE": {
        "driver": [
            {"key": "emirates_id", "label": "Emirates ID",        "requires_expiry": True},
            {"key": "license",     "label": "UAE Driving Licence", "requires_expiry": True},
            {"key": "insurance",   "label": "Insurance",           "requires_expiry": True},
            {"key": "photo",       "label": "Profile Photo",       "requires_expiry": False},
        ],
        "vehicle": [
            {"key": "mulkiya",   "label": "Mulkiya (Registration)", "requires_expiry": True},
            {"key": "insurance", "label": "Insurance",              "requires_expiry": True},
            {"key": "permit",    "label": "Operating Permit",       "requires_expiry": True},
        ],
        "operator": [
            {"key": "trade_license", "label": "Trade Licence",  "requires_expiry": True},
            {"key": "gcaa_approval", "label": "GCAA Approval",  "requires_expiry": True},
            {"key": "insurance",     "label": "Insurance",      "requires_expiry": True},
            {"key": "other",         "label": "Other",          "requires_expiry": False},
        ],
    },
    "Singapore": {
        "driver": [
            {"key": "nric",      "label": "NRIC / FIN",          "requires_expiry": True},
            {"key": "license",   "label": "Singapore Driving Licence", "requires_expiry": True},
            {"key": "insurance", "label": "Insurance",           "requires_expiry": True},
            {"key": "photo",     "label": "Profile Photo",       "requires_expiry": False},
        ],
        "vehicle": [
            {"key": "log_card",  "label": "Log Card (Registration)", "requires_expiry": True},
            {"key": "insurance", "label": "Insurance",               "requires_expiry": True},
            {"key": "permit",    "label": "Operating Permit",        "requires_expiry": True},
        ],
        "operator": [
            {"key": "acra_bizfile",  "label": "ACRA Bizfile",    "requires_expiry": False},
            {"key": "caas_approval", "label": "CAAS Approval",   "requires_expiry": True},
            {"key": "insurance",     "label": "Insurance",       "requires_expiry": True},
            {"key": "other",         "label": "Other",           "requires_expiry": False},
        ],
    },
    "default": {
        "driver": [
            {"key": "national_id", "label": "National ID",     "requires_expiry": True},
            {"key": "license",     "label": "Driving Licence", "requires_expiry": True},
            {"key": "insurance",   "label": "Insurance",       "requires_expiry": True},
            {"key": "photo",       "label": "Profile Photo",   "requires_expiry": False},
        ],
        "vehicle": [
            {"key": "registration", "label": "Registration",     "requires_expiry": True},
            {"key": "insurance",    "label": "Insurance",        "requires_expiry": True},
            {"key": "permit",       "label": "Operating Permit", "requires_expiry": True},
        ],
        "operator": [
            {"key": "company_registration", "label": "Company Registration", "requires_expiry": False},
            {"key": "insurance",            "label": "Insurance",            "requires_expiry": True},
            {"key": "other",                "label": "Other",                "requires_expiry": False},
        ],
    },
}


def get_doc_types(
    region: str,
    entity_type: str | None = None,
) -> dict[str, list[dict[str, Any]]]:
    """
    Return doc-type definitions for a given primary_region.
    Falls back to "default" if the region isn't in the registry.
    If entity_type is given, returns only that slice.
    """
    bucket = _REGISTRY.get(region, _REGISTRY["default"])
    if entity_type:
        return {entity_type: bucket.get(entity_type, [])}
    return bucket
