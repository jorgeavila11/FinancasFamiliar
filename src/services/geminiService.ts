import { GoogleGenAI, Type } from "@google/genai";

export interface ExtractedReceiptData {
  merchant: string;
  amount: number;
  date: string;
  category: string;
}

export async function extractReceiptData(base64Image: string, mimeType: string, userApiKey?: string | null): Promise<ExtractedReceiptData> {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("No Gemini API Key provided. Please configure it in Settings.");
  }
  
  const ai = new GoogleGenAI({ apiKey });
  
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
              text: "Extract the following details from this Brazilian receipt (NFC-e, Cupom Fiscal, or invoice): Merchant Name (merchant), Total Amount (amount as a number), Date (date in YYYY-MM-DD format), and Category (category). For the Category, analyze the merchant name and items to choose the best fit from: Moradia (Rent/Bills), Alimentação (Supermarket/Dining), Transporte (Fuel/Uber), Lazer (Leisure/Movies), Saúde (Pharmacy/Doctor), Educação (Books/Courses), Utilidades (Power/Water), or Outros. Return the data in strictly valid JSON format.",
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
