import { NextResponse } from "next/server";

export const revalidate = 600;

interface TwseQuote {
  code: string;
  name: string;
  price: number;
  previousClose: number;
  change: number;
  changePct: number;
  updatedAt: string;
}

export async function GET() {
  try {
    const res = await fetch(
      "https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_0050.tw",
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 600 },
      },
    );

    if (!res.ok) {
      return NextResponse.json({ error: "TWSE unavailable" }, { status: 502 });
    }

    const json = await res.json();
    const row = json.msgArray?.[0];
    if (!row) {
      return NextResponse.json({ error: "No quote data" }, { status: 502 });
    }

    const price = parseFloat(row.pz);
    const previousClose = parseFloat(row.y);
    const change = price - previousClose;
    const changePct = previousClose ? (change / previousClose) * 100 : 0;

    const quote: TwseQuote = {
      code: row.c,
      name: row.n,
      price,
      previousClose,
      change,
      changePct,
      updatedAt: `${row["^"]} ${row["%"]}`,
    };

    return NextResponse.json(quote);
  } catch {
    return NextResponse.json({ error: "Failed to fetch quote" }, { status: 500 });
  }
}
