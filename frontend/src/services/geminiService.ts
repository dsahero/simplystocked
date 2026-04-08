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

export async function getInventoryInsights(inventory: any[], checkouts: any[]): Promise<string> {
  const model = "gemini-3-flash-preview";
  const prompt = `
    Analyze the following food bank inventory and checkout history.
    Inventory: ${JSON.stringify(inventory.map(i => ({ name: i.name, stock: i.totalQuantity, min: i.minStockLevel, category: i.category })))}
    Recent Checkouts: ${JSON.stringify(checkouts.slice(0, 20).map(c => ({ name: c.itemName, qty: c.quantity, date: c.timestamp })))}
    
    Provide 3-4 concise, actionable insights for the food bank manager. 
    Focus on:
    1. Items at risk of running out soon based on usage.
    2. Categories that are overstocked.
    3. Trends in distribution.
    4. Suggestions for the next buy list.
    
    Format as a short bulleted list.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text || "No specific insights available at this time.";
}
