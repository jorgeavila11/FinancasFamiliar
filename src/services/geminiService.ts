import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ExtractedReceiptData {
  merchant: string;
  amount: number;
  date: string;
  category: string;
}

export async function extractReceiptData(base64Image: string, mimeType: string): Promise<ExtractedReceiptData> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType,
              },
            },
            {
              text: "Extract the following details from this receipt: Merchant Name (merchant), Total Amount (amount), Date (date in YYYY-MM-DD format), and Category (category). The category must be one of: Moradia, Alimentação, Transporte, Lazer, Saúde, Educação, Utilidades, or Outros. Return the data in JSON format.",
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchant: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            date: { type: Type.STRING },
            category: { type: Type.STRING },
          },
          required: ["merchant", "amount", "date", "category"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text) as ExtractedReceiptData;
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw error;
  }
}
