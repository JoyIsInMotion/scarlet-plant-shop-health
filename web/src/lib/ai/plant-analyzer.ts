import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface AIIssue {
  name: { en: string; bg: string };
  severity: 'low' | 'medium' | 'high';
  description: { en: string; bg: string };
}

export interface PlantAnalysisResult {
  species: {
    common_name: string | null;
    scientific_name: string | null;
    family: string | null;
    native_region: string | null;
    care_difficulty: 'easy' | 'moderate' | 'difficult' | null;
  };
  health: {
    health_score: number | null;
    overall_condition: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' | null;
    issues: AIIssue[];
    care_recommendations: Array<{ en: string; bg: string }>;
    watering_needed: boolean;
  };
  friendly_advice: {
    en: string;
    bg: string;
  };
  care_basics: {
    light: { en: string | null; bg: string | null };
    watering: { en: string | null; bg: string | null };
    drying: { en: string | null; bg: string | null };
    temperature: { en: string | null; bg: string | null };
    humidity: { en: string | null; bg: string | null };
    fertilizer: { en: string | null; bg: string | null };
    soil: { en: string | null; bg: string | null };
    toxicity: { en: string | null; bg: string | null };
  } | null;
  confidence: 'low' | 'medium' | 'high';
}

const PLANT_ANALYSIS_PROMPT = `You are a friendly plant care expert helping everyday plant owners — not botanists. Analyze this plant photo carefully.

First identify the plant species, then give advice that is SPECIFIC to that species — not generic tips that could apply to any plant.

Return ONLY valid JSON matching this exact schema with no markdown fencing or extra text:
{
  "species": {
    "common_name": "<common name or null if unknown>",
    "scientific_name": "<scientific name or null if unknown>",
    "family": "<plant family or null if unknown>",
    "native_region": "<origin region or null if unknown>",
    "care_difficulty": "<easy|moderate|difficult or null>"
  },
  "health": {
    "health_score": <integer 0-100 or null if cannot assess>,
    "overall_condition": "<excellent|good|fair|poor|critical or null>",
    "issues": [{ "name": { "en": "<short issue name in English>", "bg": "<short issue name in Bulgarian>" }, "severity": "<low|medium|high>", "description": { "en": "<one plain sentence in English describing exactly what you see in THIS photo>", "bg": "<same sentence in Bulgarian>" } }],
    "care_recommendations": [{ "en": "<specific tip in English>", "bg": "<same tip in Bulgarian>" }],
    "watering_needed": <true|false>
  },
  "friendly_advice": {
    "en": "<2-3 warm sentences. Name the plant, describe what you actually see in the photo, then give the single most important thing the owner should know about caring for THIS specific plant. Plain English.>",
    "bg": "<same 2-3 sentences in natural Bulgarian, naming the plant in Bulgarian if possible. Address the owner warmly.>"
  },
  "care_basics": {
    "light": { "en": "<e.g. 'Bright indirect light' or 'Full sun'>", "bg": "<e.g. 'Ярка непряка светлина' или 'Пълно слънце'>" },
    "watering": { "en": "<e.g. 'Every 7-10 days' or 'When soil is dry'>", "bg": "<e.g. 'Всеки 7-10 дни' или 'Когато почвата е суха'>" },
    "drying": { "en": "<e.g. 'Let dry between waterings' or 'Keep moist'>", "bg": "<e.g. 'Оставете да пресъхне между поливанията' или 'Поддържайте влажно'>" },
    "temperature": { "en": "<e.g. '18-24°C' or '65-75°F'>", "bg": "<e.g. '18-24°C'>" },
    "humidity": { "en": "<e.g. 'Low' or '50-70% humidity'>", "bg": "<e.g. 'Ниска' или '50-70% влажност'>" },
    "fertilizer": { "en": "<e.g. 'Monthly during growing season'>", "bg": "<e.g. 'Месечно през растежния период'>" },
    "soil": { "en": "<e.g. 'Well-draining potting mix'>", "bg": "<e.g. 'Добре дренирана почвена смес'>" },
    "toxicity": { "en": "<'Safe for pets' or 'Toxic to cats' or 'Toxic to dogs' or 'Toxic to both'>", "bg": "<e.g. 'Безопасно за домашни животни' или 'Токсично за котки'>" }
  },
  "confidence": "<low|medium|high>"
}

SPECIES-SPECIFIC ADVICE RULES:
- Every care_recommendation must be tailored to the identified species. 'Sempervivum loves full sun and nearly no water' is good. 'Keep in a bright spot' is too generic — rejected.
- Mention the plant's name or type in friendly_advice so the owner knows you recognized it.
- For succulents (Sempervivum, Echeveria, Aloe, Haworthia, Crassula, etc.): mention their drought tolerance, outdoor/full-sun preference, and that less water is better.
- For tropical plants (Monstera, Pothos, Ficus, etc.): mention indirect light needs and humidity preference.
- For flowering plants: mention bloom care specific to that species.
- issues must describe what you actually SEE in the photo, not theoretical problems.
- care_basics fields must be SHORT (2-7 words each), SPECIFIC to this plant type, and provided in BOTH English AND Bulgarian.
- care_recommendations must be provided in BOTH English AND Bulgarian languages.
- When in doubt about plant needs, recommend AVOIDING OVERWATERING rather than watering (overwatering is the #1 killer of houseplants).

WATERING RULES:
- Set watering_needed to TRUE only if you can SEE: shriveled/wrinkled leaves, wilting stems, or visibly bone-dry cracked soil.
- Set watering_needed to FALSE if the plant looks firm and healthy or shows ANY signs of moisture.
- Succulents and cacti: only flag watering if leaves are visibly soft and shriveled. When in doubt → false.
- NEVER add "water" as a care_recommendation. Instead recommend: "Avoid overwatering" or "Let soil dry between waterings" or specific prevention tips.
- care_recommendations should focus on preventing common mistakes for THIS species, not watering instructions.`;

export const MODEL_NAME = 'gemini-flash-latest';

const TRANSIENT_RETRY_DELAYS_MS = [500, 1500];

function isTransientError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message.toLowerCase() : '';
  return msg.includes('503') || msg.includes('unavailable') || msg.includes('overloaded');
}

export async function analyzePlantImage(
  imageBuffer: Buffer,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<PlantAnalysisResult> {
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 3072,
      responseMimeType: 'application/json',
    },
  });

  const imagePart = { inlineData: { data: imageBuffer.toString('base64'), mimeType } };

  let text = '';
  for (let attempt = 0; ; attempt++) {
    try {
      const result = await model.generateContent([imagePart, PLANT_ANALYSIS_PROMPT]);
      text = result.response.text().trim();
      break;
    } catch (e) {
      if (attempt < TRANSIENT_RETRY_DELAYS_MS.length && isTransientError(e)) {
        await new Promise((r) => setTimeout(r, TRANSIENT_RETRY_DELAYS_MS[attempt]));
        continue;
      }
      throw e;
    }
  }

  const json = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  try {
    return JSON.parse(json) as PlantAnalysisResult;
  } catch {
    throw new Error(`Unexpected AI response: ${json.slice(0, 300)}`);
  }
}
