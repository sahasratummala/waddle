import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY environment variable.");
}

export const genAI = new GoogleGenerativeAI(apiKey);

// Using 'gemini-1.5-flash' is the standard, but try 'gemini-1.5-flash-latest' 
// if you keep getting 404s.
export const geminiText = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
export const geminiVision = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });