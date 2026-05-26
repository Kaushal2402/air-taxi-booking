"""
Console email adapter — development fallback.

Prints every outgoing email to stdout instead of sending it.
Used automatically when SMTP_HOST is not configured.
Set EMAIL_PROVIDER=console in .env to force it explicitly.
"""
import textwrap
from datetime import datetime

from app.providers.base.email import EmailMessage, EmailProvider, EmailResult


class ConsoleEmailAdapter(EmailProvider):
    async def send(self, message: EmailMessage) -> EmailResult:
        border = "─" * 60
        import sys
        print(f"\n{'━' * 60}", flush=True)
        print(f"  📧  EMAIL (console — not actually sent)", flush=True)
        print(f"{'━' * 60}", flush=True)
        print(f"  To      : {', '.join(message.to)}", flush=True)
        if message.cc:
            print(f"  Cc      : {', '.join(message.cc)}", flush=True)
        print(f"  Subject : {message.subject}", flush=True)
        print(f"  Sent at : {datetime.utcnow().isoformat(timespec='seconds')}Z", flush=True)
        print(border, flush=True)
        if message.text_body:
            print(textwrap.indent(message.text_body.strip(), "  "), flush=True)
        else:
            # Strip HTML tags for a readable preview
            import re
            plain = re.sub(r"<[^>]+>", "", message.html_body)
            plain = re.sub(r"\n{3,}", "\n\n", plain).strip()
            print(textwrap.indent(plain, "  "), flush=True)
        print(f"{'━' * 60}\n", flush=True)
        sys.stdout.flush()
        return EmailResult(success=True)
