import * as Location from 'expo-location';

export type WeatherInfo = {
  temp: number;
  emoji: string;
  label: string;
  labelEn: string;
  city: string;
};

const WMO: Record<number, { emoji: string; ja: string; en: string }> = {
  0:  { emoji: '☀️',  ja: '快晴',          en: 'Clear Sky' },
  1:  { emoji: '🌤️', ja: '晴れ',           en: 'Mainly Clear' },
  2:  { emoji: '⛅',  ja: '曇りがち',       en: 'Partly Cloudy' },
  3:  { emoji: '☁️',  ja: '曇り',           en: 'Overcast' },
  45: { emoji: '🌫️', ja: '霧',             en: 'Foggy' },
  48: { emoji: '🌫️', ja: '霧',             en: 'Foggy' },
  51: { emoji: '🌦️', ja: '霧雨',           en: 'Light Drizzle' },
  53: { emoji: '🌦️', ja: '霧雨',           en: 'Drizzle' },
  55: { emoji: '🌦️', ja: '強い霧雨',       en: 'Dense Drizzle' },
  61: { emoji: '🌧️', ja: '小雨',           en: 'Light Rain' },
  63: { emoji: '🌧️', ja: '雨',             en: 'Rain' },
  65: { emoji: '🌧️', ja: '強雨',           en: 'Heavy Rain' },
  71: { emoji: '❄️',  ja: '小雪',           en: 'Light Snow' },
  73: { emoji: '❄️',  ja: '雪',             en: 'Snow' },
  75: { emoji: '❄️',  ja: '大雪',           en: 'Heavy Snow' },
  80: { emoji: '🌦️', ja: 'にわか雨',       en: 'Rain Showers' },
  81: { emoji: '🌦️', ja: 'にわか雨',       en: 'Rain Showers' },
  82: { emoji: '⛈️',  ja: '激しいにわか雨', en: 'Violent Showers' },
  95: { emoji: '⛈️',  ja: '雷雨',           en: 'Thunderstorm' },
  99: { emoji: '⛈️',  ja: '激しい雷雨',     en: 'Heavy Thunderstorm' },
};

function resolveWmo(code: number): { emoji: string; ja: string; en: string } {
  if (WMO[code]) return WMO[code];
  const nearest = Object.keys(WMO).map(Number).filter(k => k <= code).sort((a, b) => b - a)[0];
  return WMO[nearest] ?? { emoji: '🌡️', ja: '不明', en: 'Unknown' };
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

export async function fetchWeather(): Promise<WeatherInfo> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('location_denied');

  const loc = await withTimeout(
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
    8000
  );
  const { latitude, longitude } = loc.coords;

  const [place] = await withTimeout(
    Location.reverseGeocodeAsync({ latitude, longitude }),
    5000
  );
  const city = place?.city ?? place?.region ?? '現在地';

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode&timezone=auto`,
    { signal: ctrl.signal }
  ).finally(() => clearTimeout(timer));
  if (!res.ok) throw new Error('weather_fetch_failed');

  const data = await res.json();
  const temp = Math.round(data.current.temperature_2m as number);
  const { emoji, ja, en } = resolveWmo(data.current.weathercode as number);

  return { temp, emoji, label: ja, labelEn: en, city };
}
