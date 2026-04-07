import { GoogleGenAI, Type } from "@google/genai";
import { InvoiceData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function extractInvoiceData(input: string | { data: string; mimeType: string }): Promise<InvoiceData> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Extract structured invoice data from the provided input. 
    Return a JSON object with the following structure:
    {
      "items": [
        {
          "name": "string",
          "quantity": number,
          "cost": number,
          "isPerishable": boolean,
          "expirationDate": "YYYY-MM-DD" (optional)
        }
      ],
      "totalCost": number,
      "date": "YYYY-MM-DD"
    }
    
    If the input is an image, analyze the text. If it's text, parse it directly.
    Be precise with quantities and costs.
  `;

  const contents = typeof input === 'string' 
    ? { parts: [{ text: prompt }, { text: input }] }
    : { parts: [{ text: prompt }, { inlineData: input }] };

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                cost: { type: Type.NUMBER },
                isPerishable: { type: Type.BOOLEAN },
                expirationDate: { type: Type.STRING },
              },
              required: ["name", "quantity", "cost", "isPerishable"],
            },
          },
          totalCost: { type: Type.NUMBER },
          date: { type: Type.STRING },
        },
        required: ["items", "totalCost", "date"],
      },
    },
  });

  return JSON.parse(response.text || "{}") as InvoiceData;
}

export async function getAIChatResponse(message: string, context: string): Promise<string> {
  const model = "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `
      You are SimplyStocked AI, a helpful assistant for a food bank inventory management app.
      Current Context: ${context}
      User Message: ${message}
      
      Provide helpful, concise guidance on how to use the app or answer questions about the inventory.
    `,
  });
  return response.text || "I'm sorry, I couldn't process that request.";
}
