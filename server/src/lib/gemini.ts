import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY environment variable.");
}

export const genAI = new GoogleGenerativeAI(apiKey);

export const geminiText = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
export const geminiVision = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
