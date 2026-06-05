from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

_MONTH_NUM: dict[str, int] = {
    "January": 1, "February": 2, "March": 3, "April": 4,
    "May": 5, "June": 6, "July": 7, "August": 8,
    "September": 9, "October": 10, "November": 11, "December": 12,
}


def fiscal_year_range(
    fiscal_year_start: str,
    reference: Optional[date] = None,
) -> tuple[date, date]:
    """
    Return (fy_start, fy_end) for the fiscal year that contains *reference*.

    ``fiscal_year_start`` is a month name (e.g. ``"April"``).
    Defaults to today when *reference* is omitted.
    """
    if reference is None:
        reference = date.today()

    start_month = _MONTH_NUM.get(fiscal_year_start, 4)

    fy_year = reference.year if reference.month >= start_month else reference.year - 1
    fy_start = date(fy_year, start_month, 1)
    fy_end = date(fy_year + 1, start_month, 1) - timedelta(days=1)
    return fy_start, fy_end


def last_fiscal_year_range(
    fiscal_year_start: str,
    reference: Optional[date] = None,
) -> tuple[date, date]:
    """Return (fy_start, fy_end) for the fiscal year *before* the one containing *reference*."""
    if reference is None:
        reference = date.today()

    current_start, _ = fiscal_year_range(fiscal_year_start, reference)
    prev_end = current_start - timedelta(days=1)
    return fiscal_year_range(fiscal_year_start, prev_end)


def fiscal_year_label(fiscal_year_start: str, reference: Optional[date] = None) -> str:
    """Return a human-readable label like ``"FY 2025–26"``."""
    fy_start, _ = fiscal_year_range(fiscal_year_start, reference)
    return f"FY {fy_start.year}–{str(fy_start.year + 1)[2:]}"
