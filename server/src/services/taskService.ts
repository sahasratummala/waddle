import { geminiText, geminiVision } from "../lib/gemini";
import type { TaskGenerationResult } from "@waddle/shared";
import { TaskCategory } from "@waddle/shared";

const VALID_CATEGORIES = Object.values(TaskCategory);

function clampPoints(points: number, isSelfCare: boolean): number {
  if (isSelfCare) return Math.min(Math.max(points, 5), 30);
  return Math.min(Math.max(points, 10), 100);
}

function normalizeCategory(raw: string): TaskCategory {
  const upper = raw?.toUpperCase() as TaskCategory;
  return VALID_CATEGORIES.includes(upper) ? upper : TaskCategory.OTHER;
}

export async function generateTasks(description: string): Promise<TaskGenerationResult> {
  const prompt = `You are a friendly productivity coach for a study app called Waddle.
A user has described what they want to get done today. Turn their description into a realistic task list.

CRITICAL RULES — read carefully:
1. Map each thing the user mentions to EXACTLY ONE task. Do NOT break a single item into sub-steps.
   BAD: user says "chem homework" → you output [Read instructions, Gather materials, Complete problems, Review answers]
   GOOD: user says "chem homework" → you output [Complete chemistry homework]
2. Only create as many tasks as the user has distinct things to do. If they mention 2 things, return 2 tasks.
3. Tasks must be high-level and outcome-focused, not procedural micro-steps.
4. Add 1–2 self-care tasks that fit naturally into their day (a walk, a meal, water, rest).
5. estimatedMinutes: realistic total time for the whole task (e.g. "chem homework" = 60–90 min).
6. points: based on effort — light 10–25, medium 30–60, heavy 65–100. Self-care 5–20.
7. category must be one of: ACADEMIC, WORK, PERSONAL, SELF_CARE, CREATIVE, FITNESS, OTHER
8. urgent: set to true if the user signals urgency for that specific item — look for words like "ASAP", "urgent", "due today", "due tonight", "deadline", "need to do first", "priority", "must finish", "last minute". Self-care tasks are never urgent.
9. Return ONLY valid JSON — no markdown, no extra text.

User's day: "${description}"

Return this exact JSON shape:
{
  "tasks": [
    {
      "title": "string (concise, outcome-focused, e.g. 'Complete chemistry homework')",
      "description": "string (one sentence on what done looks like, not how to do each step)",
      "estimatedMinutes": number,
      "points": number,
      "category": "ACADEMIC|WORK|PERSONAL|CREATIVE|FITNESS|OTHER",
      "urgent": true or false
    }
  ],
  "selfCare": [
    {
      "title": "string",
      "description": "string",
      "estimatedMinutes": number,
      "points": number,
      "category": "SELF_CARE",
      "urgent": false
    }
  ]
}`;

  const result = await geminiText.generateContent(prompt);
  const text = result.response.text();

  let parsed: TaskGenerationResult;
  try {
    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .replace(/^[^{[]*/, "")
      .replace(/[^}\]]*$/, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("Raw Gemini response:", text);
    throw new Error("Gemini returned invalid JSON. Please try again.");
  }
  
  if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.selfCare)) {
    throw new Error("Gemini response missing tasks or selfCare arrays.");
  }

  return {
    tasks: parsed.tasks.map((task) => ({
      title: String(task.title || "Task").slice(0, 200),
      description: String(task.description || "").slice(0, 500),
      estimatedMinutes: Math.max(5, Math.min(180, Number(task.estimatedMinutes) || 30)),
      points: clampPoints(Number(task.points) || 20, false),
      category: normalizeCategory(task.category),
      urgent: Boolean(task.urgent),
    })),
    selfCare: parsed.selfCare.map((task) => ({
      title: String(task.title || "Self Care").slice(0, 200),
      description: String(task.description || "").slice(0, 500),
      estimatedMinutes: Math.max(5, Math.min(60, Number(task.estimatedMinutes) || 15)),
      points: clampPoints(Number(task.points) || 10, true),
      category: TaskCategory.SELF_CARE,
      urgent: false as const,
    })),
  };
}

export interface VerificationResult {
  verified: boolean;
  confidence: "high" | "medium" | "low";
  reason: string;
}

/**
 * Uses Gemini Vision to verify that a photo shows evidence of task completion.
 * imageData: base64-encoded image string (without the data:... prefix)
 * mimeType: e.g. "image/jpeg" or "image/png"
 */
export async function verifyTaskPhoto(
  taskTitle: string,
  taskDescription: string,
  imageData: string,
  mimeType: string
): Promise<VerificationResult> {
  const prompt = `You are a task verification assistant for a productivity app called Waddle.
A user claims to have completed this task and has uploaded a photo as proof.

Task: "${taskTitle}"
Description: "${taskDescription}"

Look at the photo and determine whether it provides reasonable evidence that the task was completed.
Be generous — if the photo plausibly relates to the task, verify it. Only reject if the photo is clearly unrelated (e.g., a blank wall for a "went for a walk" task).

Respond with ONLY this JSON (no markdown, no extra text):
{
  "verified": true or false,
  "confidence": "high" or "medium" or "low",
  "reason": "one sentence explaining your decision"
}`;

  const result = await geminiVision.generateContent([
    prompt,
    {
      inlineData: {
        data: imageData,
        mimeType,
      },
    },
  ]);

  const text = result.response.text();

  let parsed: VerificationResult;
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    // If Gemini can't parse cleanly, default to verified with low confidence
    return { verified: true, confidence: "low", reason: "Could not parse verification response." };
  }

  return {
    verified: Boolean(parsed.verified),
    confidence: ["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "low",
    reason: String(parsed.reason || "").slice(0, 300),
  };
}
