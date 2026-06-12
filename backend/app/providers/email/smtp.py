import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.dynamic_config import dyn
from app.providers.base.email import EmailMessage, EmailProvider, EmailResult


class SmtpAdapter(EmailProvider):
    async def send(self, message: EmailMessage) -> EmailResult:
        try:
            smtp_from     = dyn.get("SMTP_FROM")
            smtp_host     = dyn.get("SMTP_HOST")
            smtp_port     = int(dyn.get("SMTP_PORT") or "587")
            smtp_tls      = dyn.get("SMTP_TLS").lower() not in ("false", "0", "")
            smtp_user     = dyn.get("SMTP_USER")
            smtp_password = dyn.get("SMTP_PASSWORD")

            msg = MIMEMultipart("alternative")
            msg["Subject"] = message.subject
            msg["From"] = smtp_from
            msg["To"] = ", ".join(message.to)
            if message.cc:
                msg["Cc"] = ", ".join(message.cc)
            if message.reply_to:
                msg["Reply-To"] = message.reply_to

            if message.text_body:
                msg.attach(MIMEText(message.text_body, "plain"))
            msg.attach(MIMEText(message.html_body, "html"))

            all_recipients = message.to + message.cc + message.bcc

            context = ssl.create_default_context()
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                if smtp_tls:
                    server.starttls(context=context)
                if smtp_user and smtp_password:
                    server.login(smtp_user, smtp_password)
                server.sendmail(smtp_from, all_recipients, msg.as_string())

            return EmailResult(success=True)
        except Exception as exc:
            return EmailResult(success=False, error=str(exc))
