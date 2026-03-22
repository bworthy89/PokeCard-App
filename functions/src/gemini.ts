import { GoogleGenerativeAI, SchemaType, type ObjectSchema } from '@google/generative-ai';
import { defineString } from 'firebase-functions/params';

const geminiApiKey = defineString('GEMINI_API_KEY');

const getGenAI = () => new GoogleGenerativeAI(geminiApiKey.value());

const gradingSchema: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    cardName: { type: SchemaType.STRING },
    setName: { type: SchemaType.STRING },
    setNumber: { type: SchemaType.STRING },
    centering: { type: SchemaType.NUMBER },
    corners: { type: SchemaType.NUMBER },
    edges: { type: SchemaType.NUMBER },
    surface: { type: SchemaType.NUMBER },
    overallTier: { type: SchemaType.STRING },
    estimatedPSA: { type: SchemaType.STRING },
    explanation: { type: SchemaType.STRING },
  },
  required: [
    'cardName', 'setName', 'setNumber',
    'centering', 'corners', 'edges', 'surface',
    'overallTier', 'estimatedPSA', 'explanation',
  ],
};

const SYSTEM_PROMPT = `You are a Pokemon card grading assistant. Analyze the provided card image and evaluate its physical condition. Respond ONLY with valid JSON matching the schema below. Do not hallucinate card details — if you cannot identify the card, set cardName to "Unknown" and setName to "Unknown".

Evaluate these four subgrades on a 1-10 scale (half-point increments allowed):
- centering: How well-centered is the artwork within the card borders?
- corners: Any whitening, bending, or damage at the four corners?
- edges: Any whitening, nicks, or wear along the edges?
- surface: Any scratches, print lines, smudges, or holo scratches?

Determine overallTier from the average of subgrades:
- 9.5-10: "Gem Mint" (PSA 10)
- 8.5-9.4: "Near Mint" (PSA 8-9)
- 7.0-8.4: "Lightly Played" (PSA 5-7)
- 5.0-6.9: "Moderately Played" (PSA 3-4)
- Below 5: "Heavily Played" (PSA 1-2)

Write the explanation in plain English for someone unfamiliar with card grading.`;

export interface GradingResult {
  cardName: string;
  setName: string;
  setNumber: string;
  centering: number;
  corners: number;
  edges: number;
  surface: number;
  overallTier: string;
  estimatedPSA: string;
  explanation: string;
}

export const gradeCard = async (imageUrl: string): Promise<GradingResult> => {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: gradingSchema,
    },
    systemInstruction: SYSTEM_PROMPT,
  });

  const imageResponse = await fetch(imageUrl);
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const base64Image = imageBuffer.toString('base64');

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image,
      },
    },
    'Grade this Pokemon card.',
  ]);

  const text = result.response.text();
  return JSON.parse(text) as GradingResult;
};
