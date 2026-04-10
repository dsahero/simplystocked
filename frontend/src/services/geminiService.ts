import { GoogleGenAI, Type } from "@google/genai";
import { InvoiceData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function extractInvoiceData(input: string | { data: string; mimeType: string }): Promise<InvoiceData> {
  const model = "gemini-3-flash-preview";

  const prompt = `
    Extract structured invoice data from this food bank vendor invoice.
    This may come from one of three vendor types:

    1. FSWV / Feeding Southwest Virginia (Agency Order): columns are Item No., Description, Unit (Case/Pound), Quantity, Unit Fee, Total Fee, Gross Weight. Unit Fee is often very low ($0–$5) for donated items. Brand may be embedded in description in parentheses like "(KA)".

    2. Keany Produce & Gourmet (fresh produce): columns are Item No., QTY Ordered, QTY Shipped, Unit, Pack (e.g. "40 LB", "88/100 CT"), Item Description, Unit Price, Ext. Price. QTY Ordered may differ from QTY Shipped — use shipped for quantity but record ordered in quantityOrdered. All produce items are perishable.

    3. US Foods (food service distributor): columns are Product Number, Description, Pack Size (e.g. "48/4.25 OZ", "10/8 OZ"), Label (brand), Weight Pricing/Unit, Unit Price, Extended Price. Items are categorized as Dry, Refrigerated, or Frozen — use this for storageType.

    For each line item extract:
    - name: the product description (clean it up, keep brand if embedded)
    - vendorSku: the item number / product number / SKU
    - packSize: the pack size field if present (e.g. "40 LB", "48/4.25 OZ", "12/15 oz. Cans")
    - unit: the unit of measure (Case, Pound, CS, etc.)
    - quantity: quantity shipped/received (use QTY Shipped if Keany)
    - quantityOrdered: only if different from quantity (Keany Qty Ordered)
    - unitPrice: cost per unit/case (Unit Fee for FSWV, Unit Price for others); use 0 if blank
    - cost: the extended/line total price (Total Fee, Ext. Price, etc.); use unitPrice * quantity if not explicit
    - brand: brand/label if in a dedicated column or parseable from description parentheses
    - grossWeightLbs: gross weight in lbs if present (FSWV Gross Weight column)
    - storageType: "Dry", "Refrigerated", or "Frozen" if determinable from invoice structure
    - isPerishable: true for all produce, dairy, frozen, refrigerated; false for shelf-stable dry goods
    - expirationDate: if listed (rare); leave empty if not on invoice
    - _priceLabel: the exact column header used for unit price (e.g. "Unit Fee", "Unit Price")

    Also extract top-level:
    - vendorName: the vendor company name from the invoice header
    - invoiceNumber: invoice/order number (Agency Order No., Invoice No., etc.)
    - date: invoice or order date in YYYY-MM-DD format
    - totalCost: the grand total amount

    Return only real line items; skip freight/fuel surcharge/summary rows.
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
          vendorName: { type: Type.STRING },
          invoiceNumber: { type: Type.STRING },
          date: { type: Type.STRING },
          totalCost: { type: Type.NUMBER },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                vendorSku: { type: Type.STRING },
                packSize: { type: Type.STRING },
                unit: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                quantityOrdered: { type: Type.NUMBER },
                unitPrice: { type: Type.NUMBER },
                cost: { type: Type.NUMBER },
                brand: { type: Type.STRING },
                grossWeightLbs: { type: Type.NUMBER },
                storageType: { type: Type.STRING },
                isPerishable: { type: Type.BOOLEAN },
                expirationDate: { type: Type.STRING },
                _priceLabel: { type: Type.STRING },
              },
              required: ["name", "unit", "quantity", "unitPrice", "cost", "isPerishable"],
            },
          },
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
