from typing import Dict


def tier_flags(tier: str) -> Dict[str, int]:
    return {
        "tier1": 1 if tier == "Tier 1" else 0,
        "tier2": 1 if tier == "Tier 2" else 0,
        "peak_hour": 0,
    }
