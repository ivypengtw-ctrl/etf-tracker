import os
import smtplib
from datetime import date
from decimal import Decimal
from email.mime.text import MIMEText

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AlertSubscription, HoldingsChange, ETF


async def check_and_notify(db: AsyncSession, target_date: date) -> None:
    subs_result = await db.execute(select(AlertSubscription))
    subscriptions = subs_result.scalars().all()

    for sub in subscriptions:
        changes = await _get_relevant_changes(db, sub, target_date)
        if not changes:
            continue

        total_amount = sum(abs(c.amount_billion or Decimal("0")) for c in changes)
        if total_amount < sub.threshold_pct:
            continue

        etf_result = await db.execute(
            select(ETF).where(ETF.code == sub.etf_code) if sub.etf_code
            else select(ETF).where(ETF.id == changes[0].etf_id)
        )
        etf = etf_result.scalar_one_or_none()
        subject = f"ETF 異動警報：{etf.code if etf else ''} 今日加減碼 {total_amount:.1f} 億"
        body = _format_alert_body(etf, changes)

        if sub.channel.value == "email":
            await _send_email(sub.contact, subject, body)
        else:
            await _send_line(sub.contact, f"{subject}\n{body}")


async def _get_relevant_changes(db, sub, target_date):
    q = select(HoldingsChange).where(HoldingsChange.change_date == target_date)
    if sub.etf_code:
        etf_result = await db.execute(select(ETF).where(ETF.code == sub.etf_code))
        etf = etf_result.scalar_one_or_none()
        if etf:
            q = q.where(HoldingsChange.etf_id == etf.id)
    result = await db.execute(q)
    return result.scalars().all()


def _format_alert_body(etf, changes) -> str:
    lines = [f"{etf.name if etf else '未知 ETF'} 今日異動："]
    for c in changes[:10]:
        sign = "+" if c.shares_delta > 0 else ""
        lines.append(f"  {c.stock_ticker}: {sign}{c.shares_delta} 張 ({sign}{c.amount_billion or 0:.2f} 億)")
    return "\n".join(lines)


async def _send_email(to: str, subject: str, body: str) -> None:
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = os.environ.get("SMTP_USER", "")
    msg["To"] = to
    with smtplib.SMTP(os.environ.get("SMTP_HOST", "localhost"), int(os.environ.get("SMTP_PORT", "25"))) as smtp:
        smtp.send_message(msg)


async def _send_line(token: str, message: str) -> None:
    async with httpx.AsyncClient() as client:
        await client.post(
            "https://notify-api.line.me/api/notify",
            headers={"Authorization": f"Bearer {token}"},
            data={"message": message},
        )
