// Coding Accuracy Score — computed from validation history.

import type { StoredValidation } from "@/services/historyService";

export interface AccuracyScore {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  gradeColor: string;
  totalValidations: number;
  cleanRate: number;
  avgModulesTriggered: number;
  canShow: boolean;
}

const MIN_VALIDATIONS = 5;

export function computeAccuracyScore(validations: StoredValidation[]): AccuracyScore {
  if (validations.length < MIN_VALIDATIONS) {
    return {
      score: 0,
      grade: "A",
      gradeColor: "text-gray-400",
      totalValidations: validations.length,
      cleanRate: 0,
      avgModulesTriggered: 0,
      canShow: false,
    };
  }

  const cleanCount = validations.filter((v) => v.overall_status === "clean").length;
  const cleanRate = cleanCount / validations.length;

  const totalErrors = validations.reduce((s, v) => s + v.errors_found, 0);
  const totalWarnings = validations.reduce((s, v) => s + v.warnings_found, 0);
  const avgModulesTriggered = (totalErrors + totalWarnings) / validations.length;

  // Score: 100 * cleanRate, penalized slightly by avg issues per validation
  const rawScore = cleanRate * 100 - avgModulesTriggered * 5;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  let grade: AccuracyScore["grade"];
  let gradeColor: string;
  if (score >= 90) { grade = "A"; gradeColor = "text-green-600"; }
  else if (score >= 80) { grade = "B"; gradeColor = "text-cv-secondary"; }
  else if (score >= 70) { grade = "C"; gradeColor = "text-amber-600"; }
  else if (score >= 60) { grade = "D"; gradeColor = "text-orange-600"; }
  else { grade = "F"; gradeColor = "text-red-600"; }

  return {
    score,
    grade,
    gradeColor,
    totalValidations: validations.length,
    cleanRate: Math.round(cleanRate * 100),
    avgModulesTriggered: Math.round(avgModulesTriggered * 10) / 10,
    canShow: true,
  };
}
