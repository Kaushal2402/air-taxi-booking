from app.providers.base.kyc import KycProvider, KycResult, KycStatus


class NoOpKycAdapter(KycProvider):
    """v1 stub — KYC verification is manual/admin-reviewed in this release."""

    async def verify_document(
        self, document_type: str, document_data: bytes, metadata: dict
    ) -> KycResult:
        return KycResult(status=KycStatus.PENDING, reason="Manual review required")
