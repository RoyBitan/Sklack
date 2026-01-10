
import { GoogleGenAI } from "@google/genai";
import { Language } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
// Create a new instance right before making an API call to ensure it uses the most up-to-date key.
const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const translateText = async (text: string, targetLanguage: Language): Promise<string> => {
  const ai = getAIClient();
  
  try {
    // Basic text tasks like translation should use gemini-3-flash-preview
    const prompt = `Translate the following automotive technical text to ${targetLanguage}. Keep it concise and professional.\n\nText: "${text}"`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // The text output is available via the .text property (not a method).
    return response.text?.trim() || text;
  } catch (error) {
    console.error("Gemini translation failed:", error);
    return text + " (Error translating)";
  }
};

export const getSmartAnalysis = async (taskDescription: string, vehicleModel: string): Promise<string> => {
    const ai = getAIClient();
    
    try {
        // Complex reasoning tasks like mechanical analysis should use gemini-3-pro-preview
        const prompt = `You are an expert mechanic assistant. A vehicle (${vehicleModel}) has the following issue: "${taskDescription}". Suggest 3 likely causes and a recommended quick check. Keep it short (max 50 words).`;
        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: prompt,
        });
        // The text output is available via the .text property (not a method).
        return response.text?.trim() || "No analysis available.";
    } catch (error) {
        console.error("Gemini analysis failed:", error);
        return "Could not generate analysis.";
    }
};
