/**
 * JSON Validator for AI Responses
 * Cleans, parses, and validates AI output
 */

import { z } from "https://esm.sh/zod@3.22.4";
import { AIError } from "./error-handler.ts";

/**
 * Repairs common JSON issues from AI responses:
 * - Single quotes → double quotes (outside of strings)
 * - Trailing commas
 * - Unquoted keys
 * - Newlines in strings
 */
function repairJSON(jsonStr: string): string {
  let result = jsonStr;
  
  // Replace single quotes with double quotes (careful with apostrophes in text)
  // This regex handles: 'key': 'value' → "key": "value"
  result = result.replace(/(?<=[\[{,\s])\'([^']+)\'(?=\s*:)/g, '"$1"');  // Keys
  result = result.replace(/(?<=:\s*)\'([^']*)\'/g, '"$1"');  // String values
  
  // Fix unquoted keys: { key: "value" } → { "key": "value" }
  result = result.replace(/(?<=[\[{,\s])([a-zA-Z_][a-zA-Z0-9_]*)(?=\s*:)/g, '"$1"');
  
  // Remove trailing commas before } or ]
  result = result.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix newlines inside strings (replace with \n escape)
  // This is a simplified approach - handles most cases
  result = result.replace(/("(?:[^"\\]|\\.)*")/g, (match) => {
    return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
  });
  
  return result;
}

/**
 * Attempts to extract and parse JSON from text that may contain markdown or other formatting
 */
export function cleanAndParseJSON<T = unknown>(text: string): T {
  // Trim whitespace
  const trimmed = text.trim();
  
  // Helper to try parsing with repair
  const tryParse = (str: string): T | null => {
    // First try direct parse
    try {
      return JSON.parse(str);
    } catch {
      // Try with repairs
      try {
        const repaired = repairJSON(str);
        return JSON.parse(repaired);
      } catch {
        return null;
      }
    }
  };
  
  // 1. Try direct parse first (most common case)
  const directResult = tryParse(trimmed);
  if (directResult !== null) return directResult;

  // 2. Try to extract from markdown code blocks (```json ... ``` or ``` ... ```)
  const jsonBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    const blockResult = tryParse(jsonBlockMatch[1].trim());
    if (blockResult !== null) return blockResult;
  }

  // 3. Brute force: Find first { or [ and matching closing bracket
  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');
  
  let startIndex = -1;
  let endChar = '';
  
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIndex = firstBrace;
    endChar = '}';
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
    endChar = ']';
  }
  
  if (startIndex !== -1) {
    const lastIndex = trimmed.lastIndexOf(endChar);
    if (lastIndex > startIndex) {
      const extracted = trimmed.substring(startIndex, lastIndex + 1);
      const extractedResult = tryParse(extracted);
      if (extractedResult !== null) return extractedResult;
      
      // Log for debugging
      console.error('[JSON Validator] Failed to parse extracted JSON:', extracted.substring(0, 300));
      throw new AIError(
        `Failed to parse JSON from AI response after repair attempts`,
        500,
        "PARSE_ERROR"
      );
    }
  }
  
  throw new AIError("No valid JSON found in AI response", 500, "PARSE_ERROR");
}

/**
 * Validates data against a Zod schema
 * Returns validated data or throws AIError with detailed message
 */
export function validateSchema<T>(data: unknown, schema: z.ZodSchema<T>): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    // Format Zod errors into readable string
    const errorDetails = result.error.issues
      .map(i => `${i.path.join('.') || 'root'}: ${i.message}`)
      .join('; ');
      
    console.error("[Validation] Schema validation failed:", errorDetails);
    console.error("[Validation] Received data:", JSON.stringify(data).substring(0, 500));
    
    throw new AIError(
      `AI Output Validation Failed: ${errorDetails}`,
      502,
      "VALIDATION_ERROR"
    );
  }

  return result.data;
}

/**
 * Combined clean, parse, and validate in one call
 */
export function parseAndValidate<T>(text: string, schema: z.ZodSchema<T>): T {
  const parsed = cleanAndParseJSON(text);
  return validateSchema(parsed, schema);
}

/**
 * Safe parse that returns null instead of throwing
 */
export function safeParseJSON<T = unknown>(text: string): T | null {
  try {
    return cleanAndParseJSON<T>(text);
  } catch {
    return null;
  }
}

// Re-export zod for convenience
export { z };
