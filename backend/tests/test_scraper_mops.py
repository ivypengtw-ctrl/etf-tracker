from app.scrapers.mops_stocks import MopsStockScraper

SAMPLE_HTML = """
<html><body>
<table>
<tr><td>統一編號</td><td>公司名稱</td><td>產業類別</td><td>成立日期</td><td>營業項目</td></tr>
<tr><td>23454</td><td>聯發科技</td><td>半導體業</td><td>1997-05-28</td><td>IC設計、無線通訊晶片</td></tr>
</table>
</body></html>
"""


def test_mops_parses_stock_info(mocker):
    scraper = MopsStockScraper()
    mocker.patch.object(scraper, "_fetch_post", return_value=SAMPLE_HTML)
    info = scraper.scrape_stock("2454")

    assert info["name"] == "聯發科技"
    assert info["industry"] == "半導體業"
    assert info["founding_year"] == 1997


from app.scrapers.mops_managers import MopsManagerScraper

MANAGER_HTML = """
<html><body><table>
<tr><td>基金經理人</td><td>林彥名</td></tr>
<tr><td>學歷</td><td>台灣大學財務金融所</td></tr>
<tr><td>年資</td><td>10年</td></tr>
</table></body></html>
"""


def test_mops_manager_parsing():
    scraper = MopsManagerScraper()
    info = scraper._parse(MANAGER_HTML)
    assert info["name"] == "林彥名"
    assert info["experience_years"] == 10
