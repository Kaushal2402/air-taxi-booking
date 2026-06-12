import boto3
from botocore.exceptions import ClientError

from app.dynamic_config import dyn
from app.providers.base.storage import StorageProvider, UploadResult


class S3Adapter(StorageProvider):
    def __init__(self):
        region = dyn.get("AWS_REGION")
        self._client = boto3.client(
            "s3",
            aws_access_key_id=dyn.get("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=dyn.get("AWS_SECRET_ACCESS_KEY"),
            region_name=region,
        )
        self._bucket = dyn.get("AWS_BUCKET")
        self._region = region

    async def upload(
        self, file_data: bytes, key: str, content_type: str = "application/octet-stream"
    ) -> UploadResult:
        self._client.put_object(
            Bucket=self._bucket, Key=key, Body=file_data, ContentType=content_type
        )
        url = f"https://{self._bucket}.s3.{self._region}.amazonaws.com/{key}"
        return UploadResult(url=url, key=key, size_bytes=len(file_data))

    async def delete(self, key: str) -> bool:
        try:
            self._client.delete_object(Bucket=self._bucket, Key=key)
            return True
        except ClientError:
            return False

    async def get_signed_url(self, key: str, expires_in: int = 3600) -> str:
        return self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self._bucket, "Key": key},
            ExpiresIn=expires_in,
        )
