
import { GoogleGenAI, Type } from "@google/genai";
import { BusinessData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getBusinessInsights(data: BusinessData) {
  const lowStockItems = data.stock.filter(i => i.quantity <= (i.lowStockThreshold || 5));
  
  const summary = {
    totalSales: data.sales.reduce((acc, s) => acc + s.price * s.quantity, 0),
    totalGrossProfit: data.sales.reduce((acc, s) => acc + (s.price - s.cost) * s.quantity, 0),
    totalExpenses: data.expenses.reduce((acc, e) => acc + e.amount, 0),
    totalDebt: data.debts.filter(d => !d.isPaid).reduce((acc, d) => acc + d.amount, 0),
    lowStockCount: lowStockItems.length,
    lowStockNames: lowStockItems.map(i => i.name).join(', '),
  };

  const prompt = `
    Act as a professional financial advisor specializing in Electronics Retail (e.g., smartphones, laptops, tech accessories). 
    Analyze the following business summary and provide a concise, 3-point actionable advice to improve the business. 
    Focus on electronics industry trends (like model depreciation, bundle deals, and tech seasonal demand).

    Summary:
    - Total Sales: ${summary.totalSales}
    - Gross Profit: ${summary.totalGrossProfit}
    - Total Expenses: ${summary.totalExpenses}
    - Unpaid Debt: ${summary.totalDebt}
    - Net Profit: ${summary.totalGrossProfit - summary.totalExpenses}
    - Low Stock Items: ${summary.lowStockCount} (${summary.lowStockNames})
    ---
    Respond in JSON format with an "advice" array of strings.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            advice: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["advice"]
        }
      },
    });

    return JSON.parse(response.text || '{"advice": []}').advice;
  } catch (error) {
    console.error("AI Insights Error:", error);
    return [
      "Monitor tech release cycles; discount older smartphone models before new arrivals.",
      "Upsell accessories like tempered glass and chargers with every phone sale.",
      "Track warranty claims as a hidden cost to your electronics business."
    ];
  }
}
