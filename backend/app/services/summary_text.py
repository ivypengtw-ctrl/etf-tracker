from decimal import Decimal


def generate_summary_text(
    total_buy: Decimal,
    total_sell: Decimal,
    top_industry: str,
    top_industry_amount: Decimal,
    top_etf_code: str,
    top_etf_name: str,
    top_etf_amount: Decimal,
) -> str:
    return (
        f"今日主動圈 加碼 +{total_buy:.1f} 億、減碼 -{abs(total_sell):.1f} 億，"
        f"{top_industry}加碼最多（+{top_industry_amount:.1f} 億），"
        f"{top_etf_code} {top_etf_name}領頭（+{top_etf_amount:.1f} 億）。"
    )
