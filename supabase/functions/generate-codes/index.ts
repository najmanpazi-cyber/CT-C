const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are an expert orthopedic CPT and ICD-10 coding assistant. You analyze clinical documentation and suggest billing codes for orthopedic practices.

ROLE: You are an AUGMENTATIVE tool. You provide suggestions that certified coders verify before submission. Never present suggestions as final.

INSTRUCTIONS:
1. Read the clinical input carefully
2. Identify the procedure(s) performed and diagnosis/indication
3. Select the most specific CPT code supported by the documentation
4. Pair with ICD-10 codes establishing medical necessity
5. Evaluate applicable modifiers
6. Check your own work against the validation checklist below
7. Return your response as a JSON object in the exact format specified

MODIFIER RULES (enforce strictly — modifier errors are the #1 cause of orthopedic claim denials):

-LT/-RT (Laterality):
- ALWAYS check: does the documentation mention left, right, or bilateral?
- Required for ALL unilateral musculoskeletal procedures
- If laterality is missing from documentation, flag it in missing_information — do NOT guess
- Laterality in ICD-10 must match CPT modifier (right procedure = right diagnosis)

-25 (Significant, Separately Identifiable E/M):
- ONLY suggest when documentation clearly describes an E/M service that is separate from the procedure's standard pre/post work
- Common scenario: patient presents for follow-up, new problem identified, procedure performed same day
- If E/M appears to be part of the procedure's normal pre-service evaluation, do NOT suggest -25

-59 (Distinct Procedural Service):
- ONLY suggest when documentation justifies that bundled procedures were clinically distinct
- Prefer specific NCCI subset modifiers (-XE, -XS, -XP, -XU) when applicable

-50 (Bilateral):
- When same procedure performed on both sides
- Note: some payers prefer -50, others prefer separate lines with -LT/-RT

-22 (Increased Procedural Services):
- Only when documentation explicitly states work substantially exceeded typical

NCCI BUNDLING RULES (orthopedic-specific):
- Arthroscopy codes bundle with open procedure codes on same joint/same session
- Joint injection (20610) bundles with arthroscopy of same joint
- Wound closure is included in surgical CPT codes — never bill separately
- E/M on same day as surgery requires -25 modifier if separately identifiable
- Cast/splint application (29000-29799) is generally included in fracture care codes
- Add-on codes (+) must always accompany their required primary code
- When multiple procedures are performed, identify the primary (highest RVU) code first

SELF-VALIDATION CHECKLIST (run through these checks before finalizing your response):
- Laterality: Did I check for left/right/bilateral? Are modifiers correct? Does ICD-10 laterality match?
- Medical necessity: Does each ICD-10 code logically justify the CPT procedure?
- Specificity: Is this the MOST specific code the documentation supports?
- Bundling: Would any suggested codes be bundled under NCCI edits?
- Add-on codes: If I suggested an add-on code, is the required primary code present?
- Documentation sufficiency: Is there enough detail to support this code level?
- E/M assessment: If E/M is involved, is the level supported by MDM or documented time?

CONFIDENCE SCORING:
- "high": Documentation clearly supports this code with no ambiguity
- "medium": Code is likely correct but documentation has minor gaps or ambiguity
- "low": Multiple codes could apply; significant information is missing

OUTPUT: Respond with ONLY a valid JSON object. No markdown, no code fences, no explanatory text before or after the JSON.`;

function buildUserMessage(
  clinicalInput: string,
  laterality: string,
  patientType: string,
  setting: string,
  timeSpent: string
): string {
  return `Analyze this orthopedic encounter and provide coding suggestions.

CLINICAL INPUT:
${clinicalInput}

CONTEXT:
- Laterality: ${laterality || "Not specified"}
- Patient type: ${patientType || "Not specified"}
- Setting: ${setting || "Office/Outpatient"}
- Time spent: ${timeSpent || "Not specified"}

Respond with ONLY this JSON structure:

{
  "primary_code": {
    "cpt_code": "XXXXX",
    "description": "Brief procedure description",
    "confidence": "high|medium|low"
  },
  "alternatives": [
    {
      "cpt_code": "XXXXX",
      "description": "Brief description",
      "why_consider": "When this code would apply instead"
    }
  ],
  "icd10_codes": [
    {
      "code": "XXX.XX",
      "description": "Diagnosis description",
      "necessity": "How this diagnosis justifies the procedure"
    }
  ],
  "modifiers": [
    {
      "code": "-XX",
      "name": "Modifier name",
      "apply": true,
      "reason": "Why this modifier applies or why coder should verify"
    }
  ],
  "rationale": "2-4 sentence explanation of coding logic including confidence reasoning, any bundling considerations, and key documentation elements that drove the code selection.",
  "missing_information": ["Item missing from documentation that affects accuracy"],
  "warnings": [
    {
      "type": "error|warning|info",
      "message": "What the coder should know or verify"
    }
  ],
  "clean_claim_ready": true
}

RULES:
- Provide 2-3 alternatives even if primary confidence is high
- Provide at least 1 ICD-10 code
- Always evaluate -LT/-RT for unilateral procedures
- Always evaluate -25 if E/M and procedure appear on same day
- Set clean_claim_ready to false if any missing_information items exist
- Include at least one warning if confidence is medium or low
- The rationale must reference specific documentation elements
- Only include modifiers where apply is true (omit inapplicable modifiers)`;
}

function extractJSON(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text);
  } catch {
    // Fall through to extraction
  }

  const patterns = [
    /```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/,
    /(\{[\s\S]*\})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        continue;
      }
    }
  }

  return null;
}

interface ErrorResponse {
  error: true;
  error_code: string;
  error_message: string;
  user_message: string;
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  userMessage: string
): Response {
  const body: ErrorResponse = {
    error: true,
    error_code: code,
    error_message: message,
    user_message: userMessage,
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const requestLog: number[] = [];
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(): boolean {
  const now = Date.now();
  while (requestLog.length > 0 && requestLog[0] < now - RATE_WINDOW_MS) {
    requestLog.shift();
  }
  if (requestLog.length >= RATE_LIMIT) {
    return true;
  }
  requestLog.push(now);
  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse(
      405,
      "METHOD_NOT_ALLOWED",
      "Only POST requests accepted",
      "Something went wrong. Please try again."
    );
  }

  if (isRateLimited()) {
    return errorResponse(
      429,
      "RATE_LIMITED",
      "Too many requests",
      "Please wait a moment before submitting another request."
    );
  }

  try {
    const body = await req.json();
    const {
      clinical_input,
      laterality = "",
      patient_type = "",
      setting = "",
      time_spent = "",
    } = body;

    if (!clinical_input || typeof clinical_input !== "string") {
      return errorResponse(
        400,
        "MISSING_INPUT",
        "clinical_input is required",
        "Please enter clinical documentation before submitting."
      );
    }

    if (clinical_input.trim().length < 10) {
      return errorResponse(
        400,
        "INPUT_TOO_SHORT",
        "clinical_input must be at least 10 characters",
        "Please provide more detail about the clinical encounter."
      );
    }

    if (clinical_input.length > 15000) {
      return errorResponse(
        400,
        "INPUT_TOO_LONG",
        "clinical_input exceeds 15000 character limit",
        "Please shorten the clinical documentation. You can summarize the key procedure details."
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return errorResponse(
        500,
        "CONFIG_ERROR",
        "ANTHROPIC_API_KEY not configured",
        "The service is not properly configured. Please contact support."
      );
    }

    const model = Deno.env.get("CLAUDE_MODEL") || "claude-sonnet-4-20250514";

    const userMessage = buildUserMessage(
      clinical_input.trim(),
      laterality,
      patient_type,
      setting,
      time_spent
    );

    const apiResponse = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        temperature: 0.1,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!apiResponse.ok) {
      const apiError = await apiResponse.text();
      console.error("Claude API error:", apiResponse.status, apiError);

      if (apiResponse.status === 429) {
        return errorResponse(
          503,
          "AI_RATE_LIMITED",
          "Claude API rate limited",
          "Our AI service is temporarily busy. Please try again in a few seconds."
        );
      }

      if (apiResponse.status === 401) {
        return errorResponse(
          500,
          "AI_AUTH_ERROR",
          "Claude API authentication failed",
          "The service is experiencing a configuration issue. Please contact support."
        );
      }

      return errorResponse(
        502,
        "AI_ERROR",
        `Claude API returned ${apiResponse.status}`,
        "Our AI service is temporarily unavailable. Please try again."
      );
    }

    const apiData = await apiResponse.json();
    const responseText = apiData?.content?.[0]?.text;

    if (!responseText) {
      return errorResponse(
        502,
        "AI_EMPTY_RESPONSE",
        "Claude returned empty response",
        "The AI did not return a result. Please try rephrasing your input."
      );
    }

    const codingResult = extractJSON(responseText);

    if (!codingResult) {
      console.error("Failed to parse Claude response:", responseText.substring(0, 500));
      return errorResponse(
        502,
        "AI_PARSE_ERROR",
        "Could not parse AI response as JSON",
        "The AI returned an unexpected format. Please try again."
      );
    }

    const result = {
      primary_code: codingResult.primary_code || {
        cpt_code: "UNKNOWN",
        description: "Unable to determine code",
        confidence: "low",
      },
      alternatives: codingResult.alternatives || [],
      icd10_codes: codingResult.icd10_codes || [],
      modifiers: codingResult.modifiers || [],
      rationale: codingResult.rationale || "No rationale provided.",
      missing_information: codingResult.missing_information || [],
      warnings: codingResult.warnings || [],
      clean_claim_ready: codingResult.clean_claim_ready ?? false,
    };

    if (
      Array.isArray(result.missing_information) &&
      result.missing_information.length > 0
    ) {
      result.clean_claim_ready = false;
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      err.message || "Unknown error",
      "Something went wrong. Please try again."
    );
  }
});
