const allowedOrigins = (
  Deno.env.get("ALLOWED_ORIGINS") ||
  "https://888god888.github.io"
).split(",").map(s => s.trim());

function normalizeUrl(raw: string) {
  const u = new URL(raw);

  if (
    u.protocol !== "https:" ||
    !["instagram.com", "www.instagram.com"].includes(u.hostname) ||
    u.username || u.password || u.port
  ) {
    throw new Error("只接受 Instagram 的公開貼文或影片連結");
  }

  const m = u.pathname.match(
    /^\/(?:[^/]+\/)?(reel|p|tv)\/([A-Za-z0-9_-]{5,32})\/?$/
  );

  if (!m) throw new Error("請貼完整的 IG 貼文或 Reel 連結");

  return `https://www.instagram.com/${m[1]}/${m[2]}/`;
}

function decodeHtml(text: string) {
  const entities: Record<string, string> = {
    amp: "&", quot: '"', apos: "'",
    lt: "<", gt: ">", nbsp: " ",
  };

  return text.replace(
    /&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi,
    (_, value: string) => {
      if (!value.startsWith("#")) {
        return entities[value.toLowerCase()] || "";
      }

      const n = value[1].toLowerCase() === "x"
        ? parseInt(value.slice(2), 16)
        : parseInt(value.slice(1), 10);

      return n > 0 && n <= 0x10ffff
        ? String.fromCodePoint(n)
        : "";
    }
  );
}

function readMeta(html: string) {
  const meta: Record<string, string> = {};

  const tags = html.match(
    /<meta\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi
  ) || [];

  for (const tag of tags) {
    const attrs: Record<string, string> = {};

    for (const m of tag.matchAll(
      /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g
    )) {
      attrs[m[1].toLowerCase()] = decodeHtml(
        m[2] ?? m[3] ?? m[4] ?? ""
      );
    }

    const key = attrs.property || attrs.name;
    if (key && !meta[key]) meta[key] = attrs.content || "";
  }

  return meta;
}

function extractCaption(meta: Record<string, string>) {
  const title = meta["og:title"] || "";
  // IG 會依 Accept-Language 回傳「在 Instagram」等不同語言的標題。
  const titleMatch = title.match(
    /^(.*?)\s*(?:\bon\s+|[在於]\s*)Instagram\s*[:：]\s*["“]([\s\S]*)["”]\s*$/i
  );
  if (titleMatch?.[2]?.trim()) {
    return { caption: titleMatch[2].trim(), author: titleMatch[1].trim().slice(0, 120) };
  }

  for (const description of [meta["og:description"], meta.description]) {
    if (!description) continue;
    const match = description.match(
      /(?:\bon\s+|[於在]\s*)[^\n]{3,100}?\s*[:：]\s*["“]([\s\S]*)["”]\s*\.?\s*$/i
    );
    if (match?.[1]?.trim()) {
      return { caption: match[1].trim(), author: "" };
    }
  }
  return { caption: "", author: "" };
}

async function readInstagram(source: string) {
  let url = source;

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
      headers: {
        Accept: "text/html",
        "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
      },
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const next = response.headers.get("location");
      if (!next) throw new Error("IG 重新導向失敗");

      // 只允許繼續讀取 IG 貼文，不跟隨到其他網站或登入頁。
      url = normalizeUrl(new URL(next, url).href);
      continue;
    }

    if (!response.ok) {
      throw new Error(`IG 暫時無法讀取，HTTP ${response.status}`);
    }

    if (!response.headers.get("content-type")?.includes("text/html")) {
      throw new Error("IG 沒有回傳可讀取的貼文網頁");
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("IG 回傳空白內容");

    const chunks: Uint8Array[] = [];
    let size = 0;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      size += value.length;

      if (size > 2500000) {
        await reader.cancel();
        throw new Error("貼文網頁超過讀取上限");
      }

      chunks.push(value);
    }

    const bytes = new Uint8Array(size);
    let offset = 0;

    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }

    const meta = readMeta(new TextDecoder().decode(bytes));

    if (
      meta["og:url"] &&
      normalizeUrl(meta["og:url"]) !== source
    ) {
      throw new Error("IG 回傳的內容與這個連結不符");
    }

    const { caption, author } = extractCaption(meta);

    if (caption.trim().length < 4) {
      throw new Error(
        "沒有讀到貼文介紹，可能需要登入、內容受限或已刪除。尚未完成整理。"
      );
    }

    return {
      caption: caption.trim().slice(0, 60000),
      author,
    };
  }

  throw new Error("IG 重新導向次數過多");
}

function organize(caption: string) {
  const lines = caption.replace(/\r/g, "").split("\n")
    .map(s => s.trim());

  const addressPattern =
    /(?:臺北|台北|新北|桃園|臺中|台中|臺南|台南|高雄|新竹|基隆|宜蘭|苗栗|彰化|南投|雲林|嘉義|屏東|花蓮|臺東|台東|澎湖|金門|連江)[市縣][^\n，。]{3,75}號(?:之\d+)?(?:\s*\d+樓)?/;

  const cityPattern =
    /(?:臺北|台北|新北|桃園|臺中|台中|臺南|台南|高雄|新竹|基隆|宜蘭|苗栗|彰化|南投|雲林|嘉義|屏東|花蓮|臺東|台東|澎湖|金門|連江)(?:市|縣)?/g;

  const normalize = (s: string) =>
    s.toLowerCase().replace(/[’‘]/g, "'").replace(/\s/g, "");

  const cleanName = (s: string) => s
    .replace(/^\s*(?:\d+[.、)）]\s*)?[\s📍🍽️🍜🍖🏠🏡☕🍰\-]+/u, "")
    .replace(/[「」『』]/g, "")
    .trim();

  const validName = (s: string) =>
    s.length >= 2 && s.length <= 50 &&
    !/https?:|#|地址|電話|營業時間|推薦|必吃|懶人包|[。!?！？]/.test(s) &&
    !addressPattern.test(s);

  const names: string[] = [];

  function addName(raw: string) {
    const name = cleanName(raw);

    if (
      validName(name) &&
      !names.some(n => normalize(n) === normalize(name)) &&
      names.length < 20
    ) {
      names.push(name);
    }
  }

  for (const line of lines) {
    const label = line.match(
      /^(?:店名|餐廳名稱|景點名稱|名稱)\s*[:：]\s*(.+)$/
    );
    if (label) addName(label[1]);

    // 支援「🍽️店家A、店家B、店家C」這種合集。
    if (/^(?:🍽|🍜|🍖|🏠|🏡|☕|🍰)/u.test(line)) {
      const parts = cleanName(line)
        .split(/[、，,|｜]/).map(cleanName);

      if (
        parts.length >= 2 && parts.length <= 20 &&
        parts.every(validName)
      ) {
        parts.forEach(addName);
      }
    }

    const pin = line.match(/^📍\s*(.+)$/u);
    if (pin) addName(pin[1]);
  }

  if (!names.length) {
    for (const m of caption.matchAll(/[「『]([^」』]{2,35})[」』]/g)) {
      if (/麵|飯|餐|店|館|咖啡|甜點|食堂|Diner/i.test(m[1])) {
        addName(m[1]);
      }
    }
  }

  const blocks = new Map<string, string[]>(
    names.map(name => [name, []])
  );

  let owner = "";

  for (const line of lines) {
    const hits = names.filter(name =>
      normalize(line).includes(normalize(name))
    );

    if (hits.length === 1) {
      owner = hits[0];
      blocks.get(owner)!.push(line);
    } else if (hits.length > 1 || !line) {
      owner = "";
    } else if (owner) {
      blocks.get(owner)!.push(line);
    }
  }

  const cities = [...new Set(
    (caption.match(cityPattern) || [])
      .map(s => s.replace("臺", "台").replace(/[市縣]$/, ""))
  )];

  const commonCity = cities.length === 1 ? cities[0] : "";

  return names.map(title => {
    const text = names.length === 1
      ? caption
      : (blocks.get(title) || []).join("\n");

    const address = text.match(addressPattern)?.[0] || "";

    const price = text.match(
      /(?:人均|每人|均消|價位|價格|低消)\s*[:：]?\s*(?:NT\$|\$)?\s*\d[\d,]*(?:\s*[-~～至]\s*\d[\d,]*)?\s*元?/i
    )?.[0] || "";

    const category = /咖啡|甜點|布丁|蛋糕/.test(title + text)
      ? "咖啡甜點"
      : /飯店|旅館|民宿|住宿/.test(title + text)
      ? "住宿"
      : /景點|步道|瀑布|公園|夜景|展覽/.test(title + text)
      ? "景點"
      : /麵|飯|餐|肉|料理|小吃|Diner|美食|食堂|燒|鍋/i.test(title + text)
      ? "美食"
      : "其他";

    return {
      title,
      category,
      city: address.match(cityPattern)?.[0]?.replace("臺", "台") ||
        commonCity,
      address,
      price,
      tags: [
        "拉麵", "燒肉", "火鍋", "咖啡", "甜點",
        "布丁", "牛肉麵", "小吃", "夜景", "步道", "眷村", "美式",
      ].filter(tag => (title + text).includes(tag)),
      notes: text.split("\n")
        .filter(s =>
          s && !s.startsWith("#") &&
          !addressPattern.test(s) &&
          normalize(cleanName(s)) !== normalize(title)
        )
        .slice(0, 5).join("\n").slice(0, 700),
    };
  });
}

Deno.serve(async request => {
  const origin = request.headers.get("origin") || "";

  const headers = {
    "Access-Control-Allow-Origin":
      allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "content-type,x-pocket-token",
    "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };

  const reply = (body: unknown, status = 200) =>
    Response.json(body, { status, headers });

  if (origin && !allowedOrigins.includes(origin)) {
    return reply({ error: "此網站不在允許來源清單" }, 403);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  const token = Deno.env.get("POCKET_ACCESS_TOKEN") || "";

  if (token.length < 24) {
    return reply({
      error: "請設定至少 24 字元的 POCKET_ACCESS_TOKEN",
    }, 503);
  }

  if (request.headers.get("x-pocket-token") !== token) {
    return reply({ error: "連線密碼不正確" }, 401);
  }

  if (request.method === "GET") {
    return reply({ ok: true, version: 3, mode: "public-caption-rules" });
  }

  if (request.method !== "POST") {
    return reply({ error: "請使用 POST" }, 405);
  }

  try {
    const body = await request.text();
    if (body.length > 8192) {
      return reply({ error: "請求內容過大" }, 413);
    }

    const input = JSON.parse(body);
    if (typeof input.url !== "string") {
      return reply({ error: "缺少 url" }, 400);
    }

    let source: string;

    try {
      source = normalizeUrl(input.url);
    } catch (e) {
      return reply({ error: (e as Error).message }, 400);
    }

    const result = await readInstagram(source);
    const places = organize(result.caption);

    return reply({
      ...result,
      source,
      content: result.caption,
      places,
      fields: places[0] || {},
      needsReview: places.length === 0,
      method: "public-caption-rules",
      videoAnalyzed: false,
      message: places.length
        ? `已辨識 ${places.length} 個地點，請確認資訊。`
        : "已讀到介紹，但無法可靠辨識店名，請補充確認。",
    });
  } catch (e) {
    return reply({
      error: e instanceof Error ? e.message : "解析失敗",
    }, 422);
  }
});
