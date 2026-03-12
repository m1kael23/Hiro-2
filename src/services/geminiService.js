/* global process */
import { GoogleGenAI } from "@google/genai";

// Shared lazy client — safe to call with no key; returns null gracefully.
let _ai = null;
export function getGeminiClient() {
  // Gemini disabled by user request to save usage
  return null;
}

/**
 * Analyzes work experience and returns a trajectory string.
 */
export async function analyzeTrajectory(workExperience) {
  if (!workExperience || workExperience.length === 0) {
    return "not enough data to generate a response";
  }

  const expString = workExperience
    .map(exp => `${exp.role || exp.title} at ${exp.company || exp.co} (${exp.period || exp.years})`)
    .join("\n");

  const prompt = `
    Analyze the following work experience and summarize the career trajectory in a concise, professional format using arrows (->).
    Focus on the progression of roles.
    If there is not enough information, return exactly: "not enough data to generate a response".
    Example: Junior Developer -> Senior Developer -> Engineering Manager
    Experience:\n${expString}\nSummary:
  `;

  const ai = getGeminiClient();
  if (!ai) {
    console.warn("Gemini API key not set — skipping trajectory analysis.");
    return "not enough data to generate a response";
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: { temperature: 0.1, maxOutputTokens: 50 },
    });
    const result = response.text.trim();
    return result && result.length >= 5 ? result : "not enough data to generate a response";
  } catch (error) {
    console.error("Error analyzing trajectory:", error);
    return "not enough data to generate a response";
  }
}
