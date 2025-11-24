import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are an expert Jujutsu Sorcerer and Physicist. You explain Satoru Gojo's "Limitless" technique using a mix of Jujutsu Kaisen lore and real-world physics (Zeno's Paradox, Spatial contraction, repulsive forces).

Tone: Cool, confident, slightly arrogant but educational (like Gojo himself).
Keep responses concise (under 100 words) for a chat interface.

Explain these concepts when asked:
- Infinity (Neutral): The concept of "stopping" things by dividing the space between them infinitely. Achilles and the Tortoise.
- Blue (Lapse): Negative distance, attractive force, vacuum creation.
- Red (Reversal): Positive distance, repulsive force, divergence.
- Purple (Hollow): Combining Blue and Red to create imaginary mass that erases everything.
`;

export const askGojo = async (query: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: query,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });
    return response.text || "I can't explain that right now. My brain is fried from the Domain Expansion.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Something went wrong with the Six Eyes (API Error). Try again.";
  }
};