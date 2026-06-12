import httpx

from app.dynamic_config import dyn
from app.providers.base.whatsapp import WhatsAppProvider, WhatsAppResult


class GenericCloudApiWhatsAppAdapter(WhatsAppProvider):
    """Config-driven WhatsApp adapter targeting Meta Cloud API or any BSP."""

    async def send_text(self, to: str, message: str) -> WhatsAppResult:
        endpoint = dyn.get("WHATSAPP_ENDPOINT")
        if not endpoint:
            return WhatsAppResult(success=False, error="WHATSAPP_ENDPOINT not configured")
        try:
            async with httpx.AsyncClient() as client:
                r = await client.post(
                    endpoint,
                    headers={"Authorization": f"Bearer {dyn.get('WHATSAPP_TOKEN')}"},
                    json={
                        "messaging_product": "whatsapp",
                        "to": to,
                        "type": "text",
                        "text": {"body": message},
                    },
                )
                r.raise_for_status()
                data = r.json()
                return WhatsAppResult(
                    success=True,
                    message_id=data.get("messages", [{}])[0].get("id"),
                )
        except Exception as exc:
            return WhatsAppResult(success=False, error=str(exc))

    async def send_template(
        self, to: str, template_name: str, language: str, components: list
    ) -> WhatsAppResult:
        endpoint = dyn.get("WHATSAPP_ENDPOINT")
        if not endpoint:
            return WhatsAppResult(success=False, error="WHATSAPP_ENDPOINT not configured")
        try:
            async with httpx.AsyncClient() as client:
                r = await client.post(
                    endpoint,
                    headers={"Authorization": f"Bearer {dyn.get('WHATSAPP_TOKEN')}"},
                    json={
                        "messaging_product": "whatsapp",
                        "to": to,
                        "type": "template",
                        "template": {
                            "name": template_name,
                            "language": {"code": language},
                            "components": components,
                        },
                    },
                )
                r.raise_for_status()
                data = r.json()
                return WhatsAppResult(
                    success=True,
                    message_id=data.get("messages", [{}])[0].get("id"),
                )
        except Exception as exc:
            return WhatsAppResult(success=False, error=str(exc))
