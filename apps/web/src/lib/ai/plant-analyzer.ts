import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface AIIssue {
  name: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
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
    care_recommendations: string[];
    watering_needed: boolean;
  };
  confidence: 'low' | 'medium' | 'high';
}

const PLANT_ANALYSIS_PROMPT = `You are an expert botanist and plant health specialist. Analyze this plant photo carefully.
Perform TWO tasks: (1) identify the plant species, (2) assess its health.
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
    "issues": [{ "name": "<issue name>", "severity": "<low|medium|high>", "description": "<one concise sentence>" }],
    "care_recommendations": ["<specific actionable recommendation>"],
    "watering_needed": <true|false>
  },
  "confidence": "<low|medium|high>"
}
If no health issues are detected, return an empty issues array.
If you cannot clearly see a plant, set confidence to "low" and health_score to null.`;

export const MODEL_NAME = 'meta-llama/llama-4-scout-17b-16e-instruct';

export async function analyzePlantImage(
  imageBuffer: Buffer,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<PlantAnalysisResult> {
  const response = await groq.chat.completions.create({
    model: MODEL_NAME,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${imageBuffer.toString('base64')}`,
            },
          },
          {
            type: 'text',
            text: PLANT_ANALYSIS_PROMPT,
          },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 1024,
  });

  const text = response.choices[0].message.content?.trim() ?? '';
  const json = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  try {
    return JSON.parse(json) as PlantAnalysisResult;
  } catch {
    throw new Error(`Unexpected AI response: ${json.slice(0, 300)}`);
  }
}
