import type { CoordItem } from './constants';
import { CATS, SEASONS } from './constants';
import type { ClothItem } from './db';
import type { Lang } from './i18n';
import type { WeatherInfo } from './weather';

const MODEL = 'claude-haiku-4-5-20251001';

async function callClaude(body: object, timeoutMs: number): Promise<string> {
  const key = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY!;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return data.content[0].text as string;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchSuggestedCoords(
  clothes: ClothItem[],
  tpo: string,
  weather: WeatherInfo | null,
  lang: Lang,
): Promise<CoordItem[]> {
  const list = clothes.map(c => `ID:${c.id} 名前:${c.name} カテゴリ:${c.cat}`).join('\n');
  const scene = tpo === 'すべて' ? '自由なシーン' : tpo;
  const weatherCtx = weather
    ? `今日の天気は${weather.emoji}${weather.label}、気温は${weather.temp}°Cです。この気温と天気に適した服装を優先してください。`
    : '';
  const weatherLabel = weather ? `${weather.emoji} ${weather.temp}°C` : '';
  const langInstr = lang === 'en' ? 'Write the "comment" field in English.' : '';
  const prompt = `以下の服のリストからTPO「${scene}」に合うコーディネートを2通り提案してください。${weatherCtx}${langInstr}\n\n服のリスト:\n${list}\n\n以下のJSON配列のみを返してください（説明文は不要）:\n[{"id":"1","tpo":"${scene}","weather":"${weatherLabel}","ids":["服のIDを3〜4個"],"comment":"コーデの説明50文字以内","score":90},{"id":"2","tpo":"${scene}","weather":"${weatherLabel}","ids":["服のIDを2〜3個"],"comment":"コーデの説明50文字以内","score":85}]`;

  const text = await callClaude({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  }, 30000);

  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Invalid response');
  return JSON.parse(match[0]) as CoordItem[];
}

export async function fetchClothAnalysis(
  base64: string,
  mimeType: string,
  lang: Lang,
): Promise<{ names: string[]; cat: string; color: string; season: string }> {
  const catList = CATS.slice(1);
  const prompt = lang === 'en'
    ? `Analyze this clothing item. Return only JSON:\n{"names":["3 short English names max 10 chars each"],"cat":"one of: ${catList.join(',')}","color":"main color in Japanese (e.g. 白,黒,ネイビー,ベージュ)","season":"one of: 春,夏,秋,冬,オールシーズン"}\nExample: {"names":["White Shirt","Cotton Top","Basic Tee"],"cat":"トップス","color":"白","season":"オールシーズン"}`
    : `この服を解析してJSONのみ返してください:\n{"names":["短い名前を3つ（各10文字以内）"],"cat":"${catList.join('、')}のどれか","color":"メインカラー（例：白、黒、ネイビー、ベージュ）","season":"春、夏、秋、冬、オールシーズンのどれか"}\n例：{"names":["白シャツ","コットンT","ベーシック"],"cat":"トップス","color":"白","season":"オールシーズン"}`;

  const text = await callClaude({
    model: MODEL,
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
        { type: 'text', text: prompt },
      ],
    }],
  }, 20000);

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Invalid response');
  const r = JSON.parse(match[0]);
  return {
    names: Array.isArray(r.names) ? r.names.slice(0, 3) : [],
    cat: catList.includes(r.cat) ? r.cat : catList[0],
    color: typeof r.color === 'string' ? r.color : '',
    season: SEASONS.includes(r.season) ? r.season : 'オールシーズン',
  };
}
