import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert orthopedic medical coding assistant. You analyze clinical documentation and suggest accurate CPT billing codes with ICD-10 diagnosis pairings, modifier recommendations, and confidence scoring.

You MUST respond with valid JSON matching this exact structure:
{
  "primary_code": {
    "cpt_code": "string (5-digit CPT code)",
    "description": "string (procedure description)",
    "confidence": "high" | "medium" | "low"
  },
  "alternatives": [
    {
      "cpt_code": "string",
      "description": "string",
      "why_consider": "string"
    }
  ],
  "icd10_codes": [
    {
      "code": "string (ICD-10 code)",
      "description": "string",
      "necessity": "string (medical necessity justification)"
    }
  ],
  "modifiers": [
    {
      "code": "string (e.g. -RT)",
      "name": "string",
      "apply": true/false,
      "reason": "string"
    }
  ],
  "rationale": "string (detailed explanation of why these codes were selected, referencing specific documentation elements)",
  "missing_information": ["string (each item describes what's missing from the documentation)"],
  "warnings": [
    {
      "type": "error" | "warning" | "info",
      "message": "string"
    }
  ],
  "clean_claim_ready": true/false
}

Rules:
- Only suggest orthopedic-related codes
- Set clean_claim_ready to false if there are any missing_information items
- Confidence should be "high" only when documentation clearly supports the code
- Always include at least one ICD-10 code
- Include modifiers when laterality, multiple procedures, or special circumstances apply
- Check for NCCI bundling conflicts between primary and alternative codes
- Provide thorough rationale referencing specific elements from the documentation
- Return ONLY valid JSON, no markdown, no code fences`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clinical_input, laterality, patient_type, setting, time_spent } =
      await req.json();

    // Validate input
    if (!clinical_input || typeof clinical_input !== "string" || clinical_input.trim().length === 0) {
      return new Response(
        JSON.stringify({
          error: true,
          error_code: "MISSING_INPUT",
          error_message: "clinical_input is required",
          user_message: "Please enter clinical documentation before submitting.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (clinical_input.trim().length < 10) {
      return new Response(
        JSON.stringify({
          error: true,
          error_code: "INPUT_TOO_SHORT",
          error_message: "Input too short",
          user_message: "Please provide more detail about the clinical encounter.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (clinical_input.length > 15000) {
      return new Response(
        JSON.stringify({
          error: true,
          error_code: "INPUT_TOO_LONG",
          error_message: "Input too long",
          user_message: "Please shorten the clinical documentation.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userMessage = `Analyze the following clinical documentation and provide CPT coding suggestions.

Context:
- Laterality: ${laterality || "Not specified"}
- Patient Type: ${patient_type || "Not specified"}
- Setting: ${setting || "Office/Outpatient"}
- Time Spent: ${time_spent || "Not specified"}

Clinical Documentation:
${clinical_input}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: true,
            error_code: "AI_RATE_LIMITED",
            error_message: "Rate limited",
            user_message: "Our AI service is temporarily busy. Please try again in a few seconds.",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: true,
            error_code: "AI_ERROR",
            error_message: "Payment required",
            user_message: "AI service credits exhausted. Please contact support.",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({
          error: true,
          error_code: "AI_ERROR",
          error_message: errorText,
          user_message: "Our AI service is temporarily unavailable. Please try again.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({
          error: true,
          error_code: "AI_PARSE_ERROR",
          error_message: "Empty AI response",
          user_message: "The AI returned an unexpected format. Please try again.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse JSON from AI response (handle potential markdown fences)
    let parsed;
    try {
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleanContent);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({
          error: true,
          error_code: "AI_PARSE_ERROR",
          error_message: "Failed to parse AI response",
          user_message: "The AI returned an unexpected format. Please try again.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-codes error:", e);
    return new Response(
      JSON.stringify({
        error: true,
        error_code: "INTERNAL_ERROR",
        error_message: e instanceof Error ? e.message : "Unknown error",
        user_message: "Something went wrong. Please try again.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
