from __future__ import annotations

# ISO 4217 → display symbol
_SYMBOLS: dict[str, str] = {
    "INR": "₹",
    "USD": "$",
    "EUR": "€",
    "GBP": "£",
    "AED": "د.إ",
    "SGD": "S$",
    "MYR": "RM",
    "THB": "฿",
    "JPY": "¥",
    "CNY": "¥",
    "AUD": "A$",
    "CAD": "C$",
    "HKD": "HK$",
}


def currency_symbol(code: str) -> str:
    """Return the display symbol for an ISO 4217 currency code."""
    return _SYMBOLS.get(code.upper(), code)


def fmt_minor(amount_minor: int, currency: str) -> str:
    """Format a minor-unit integer (e.g. paise) as a display string."""
    sym = currency_symbol(currency)
    return f"{sym}{amount_minor // 100:,}"


def fmt_major(amount: float, currency: str) -> str:
    """Format a major-unit float as a display string."""
    sym = currency_symbol(currency)
    return f"{sym}{amount:,.2f}"
