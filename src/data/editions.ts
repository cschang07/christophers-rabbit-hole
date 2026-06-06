import type { Edition } from "@/lib/types";

export const currentEdition: Edition = {
  date: "2026-06-05",
  label: "Jun 5, 2026",
  themes: [
    {
      id: "theme-0050",
      slug: "0050",
      name: "0050",
      description: "元大台灣50 — 成分股、資金流向、配息與大盤脈動",
      status: "active",
      accent: "#0f766e",
      icon: "chart",
    },
    {
      id: "theme-ai",
      slug: "ai",
      name: "AI",
      description: "模型發布、基礎建設、企業採用",
      status: "empty",
      accent: "#6366f1",
      icon: "spark",
    },
    {
      id: "theme-bitcoin",
      slug: "bitcoin",
      name: "Bitcoin",
      description: "鏈上數據、ETF 流向、宏觀連動",
      status: "empty",
      accent: "#f59e0b",
      icon: "coin",
    },
    {
      id: "theme-semi",
      slug: "semiconductor",
      name: "Semiconductor",
      description: "台積電、記憶體、設備與供應鏈",
      status: "empty",
      accent: "#3b82f6",
      icon: "chip",
    },
    {
      id: "theme-macro",
      slug: "macro",
      name: "Macro",
      description: "利率、匯率、通脫與全球流動性",
      status: "empty",
      accent: "#8b5cf6",
      icon: "globe",
    },
    {
      id: "theme-taiwan",
      slug: "taiwan-market",
      name: "Taiwan Market",
      description: "台股政策、法說、產業輪動",
      status: "empty",
      accent: "#ec4899",
      icon: "flag",
    },
  ],
  articles: [
    {
      id: "art-0050-1",
      themeId: "theme-0050",
      slug: "0050-daily-briefing-0605",
      title: "0050 每日簡報：外資大賣、下半年配息預告、與 0056 資金輪動全解析",
      dek: "外資單日減碼逾 82 億、成分股台積電拖累淨值、配息季將至存股族估值、0056 吸金 45 億 vs 0050 淨贖回——今日所有 0050 關鍵訊號一文整理。",
      publishedAt: "2026-06-05T07:00:00+08:00",
      readMinutes: 10,
      sourceCount: 6,
      citations: [
        { id: "c1", label: "鉅亨網", url: "https://www.cnyes.com" },
        { id: "c2", label: "經濟日報", url: "https://money.udn.com" },
        { id: "c3", label: "元大投信", url: "https://www.yuantaetfs.com" },
        { id: "c4", label: "台灣證交所", url: "https://www.twse.com.tw" },
        { id: "c5", label: "MoneyDJ", url: "https://www.moneydj.com" },
        { id: "c6", label: "CMoney", url: "https://www.cmoney.tw" },
      ],
      sections: [
        {
          id: "s1",
          heading: "外資大舉減碼 ETF",
          paragraphs: [
            "台灣證交所統計顯示，外資今日賣超台股逾 200 億元，其中 0050 單日遭減碼約 82 億元，為今年五月以來最大單日賣超規模。ETF 遭賣超通常反映法人對大盤權值股配置的快速調整，而非單一個股事件。",
            "0050 今日收盤下跌 1.8%，報 183.2 元，成交量較 20 日均量放大 35%。同期台灣 50 指數下跌 1.6%，顯示 ETF 與指數走勢高度連動，折溢價維持在 ±0.1% 的窄幅區間。",
          ],
          citationIds: ["c1", "c4"],
        },
        {
          id: "s2",
          heading: "成分股拖累：台積電佔比近半",
          paragraphs: [
            "0050 前三大成分股台積電、鴻海、聯發科合計權重超過 55%，今日分別下跌 2.1%、1.4%、2.3%。台積電權重約 48%，是淨值波動的主要來源；外資對半導體族群調節，直接反映在 ETF 淨值上。",
            "元大投信公告指出，0050 追蹤台灣 50 指數，每季調整成分股與權重，下次定期調整預計在 6 月下旬。近期無成分股異動，淨值波動純粹來自市場價格變動。",
          ],
          citationIds: ["c2", "c3"],
        },
        {
          id: "s3",
          heading: "技術面與資金觀察",
          paragraphs: [
            "技術分析師指出，0050 在 180–185 元區間已整理兩週，今日跌破短期均線，下一支撐看向 175 元前低。投信今日買超 12 億元，部分抵銷外資賣壓，顯示國內法人採逢低佈局策略。",
            "投資人接下來關注美國非農就業數據與 Fed 官員談話，若美元走強、亞股承壓，0050 短期可能持續震盪。中長期則看台積電法說展望與下半年配息公告。",
          ],
          citationIds: ["c1", "c2"],
        },
        {
          id: "s4",
          heading: "下半年配息預告將至",
          paragraphs: [
            "0050 慣例於每年 7 月、1 月進行收益分配，實際除息日與配息金額需待投信公告。去年下半年配息 2.05 元，上半年 1.8 元，合計 3.85 元，以當時均價估算年化權利率約 3.2%。",
            "投信表示，配息來源包含成分股股息、證券借貸收入與期貨避險收益，金額會隨成分股配息與市場波動調整，並非固定。",
          ],
          citationIds: ["c3", "c5"],
        },
        {
          id: "s5",
          heading: "存股族怎麼看配息",
          paragraphs: [
            "以目前股價 183 元估算，若維持去年配息水準，預估權利率落在 2.8–3.5% 區間。部分投資人選擇在除息前佈局，除息後價格回填則視大盤氣氛而定。",
            "CMoney 社群討論指出，高頻存股族群更在意長期累積配息與成本均價，短期除息行情並非唯一考量。",
          ],
          citationIds: ["c5", "c6"],
        },
        {
          id: "s6",
          heading: "0056 vs 0050：本月資金輪動",
          paragraphs: [
            "本月以來 0056 累計淨申購約 45 億元，0050 則淨贖回約 18 億元。投信買超 0056 明顯，外資賣超 0050 為主，反映法人對「高股息防禦」與「權值成長」的偏好切換。兩檔 ETF 成分重疊度低，0056 偏重金融、傳產與電信，0050 集中科技權值。當半導體修正時，資金往往短暫流向高股息標的。",
            "歷史上 0050 與 0056 的輪動通常持續數週，而非長期趨勢反轉。若台積電營收展望回溫，資金可能回流 0050。元大投信提醒，ETF 選擇應對應投資目的：0050 適合追蹤大盤，0056 適合追求現金流，不宜單以短期資金流向判斷。",
          ],
          citationIds: ["c1", "c2", "c3"],
        },
      ],
      relatedSlugs: [],
    },
  ],
};

export function getThemeBySlug(slug: string) {
  return currentEdition.themes.find((t) => t.slug === slug);
}

export function getArticlesByTheme(themeId: string) {
  return currentEdition.articles.filter((a) => a.themeId === themeId);
}

export function getArticleBySlug(slug: string) {
  return currentEdition.articles.find((a) => a.slug === slug);
}

export function getThemeForArticle(articleId: string) {
  const article = currentEdition.articles.find((a) => a.id === articleId);
  if (!article) return undefined;
  return currentEdition.themes.find((t) => t.id === article.themeId);
}
