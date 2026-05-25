from app.providers.base.call_masking import CallMaskingProvider, MaskedCallSession


class NoOpCallMaskingAdapter(CallMaskingProvider):
    """v1 stub — direct/in-app contact only, no number masking."""

    async def create_session(
        self, caller: str, callee: str, expires_in: int = 3600
    ) -> MaskedCallSession:
        raise NotImplementedError("Call masking not available in v1")

    async def end_session(self, session_id: str) -> bool:
        return False
