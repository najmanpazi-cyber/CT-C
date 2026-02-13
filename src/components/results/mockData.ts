import type { CodingResult } from "@/types/coding";

export const MOCK_RESULT: CodingResult = {
  primary_code: {
    cpt_code: "27447",
    description: "Total knee arthroplasty",
    confidence: "high",
  },
  alternatives: [
    {
      cpt_code: "27446",
      description: "Arthroplasty, knee, condyle and plateau, medial OR lateral",
      why_consider: "If documentation indicates unicompartmental rather than total replacement",
    },
    {
      cpt_code: "27487",
      description: "Revision of total knee arthroplasty",
      why_consider: "If this is a revision of a prior arthroplasty rather than a primary procedure",
    },
  ],
  icd10_codes: [
    {
      code: "M17.11",
      description: "Primary osteoarthritis, right knee",
      necessity: "Severe osteoarthritis with failed conservative management justifies total knee arthroplasty",
    },
  ],
  modifiers: [
    {
      code: "-RT",
      name: "Right side",
      apply: true,
      reason: "Documentation specifies right knee procedure",
    },
  ],
  rationale:
    "Documentation describes a total knee arthroplasty on the right knee for a 68-year-old female with severe osteoarthritis after failed conservative treatment including physical therapy, NSAIDs, and corticosteroid injections. CPT 27447 is the specific code for total knee arthroplasty. M17.11 establishes medical necessity with laterality matching the -RT modifier. High confidence due to clear documentation of procedure, indication, and approach.",
  missing_information: [],
  warnings: [],
  clean_claim_ready: true,
};
