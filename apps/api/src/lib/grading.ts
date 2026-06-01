export interface GradedResult {
  totalScore: number;
  grade: string;
  gradePoint: number;
}

export function gradeFor(totalScore: number): { grade: string; gradePoint: number } {
  if (totalScore >= 70) return { grade: 'A', gradePoint: 5 };
  if (totalScore >= 60) return { grade: 'B', gradePoint: 4 };
  if (totalScore >= 50) return { grade: 'C', gradePoint: 3 };
  if (totalScore >= 45) return { grade: 'D', gradePoint: 2 };
  if (totalScore >= 40) return { grade: 'E', gradePoint: 1 };
  return { grade: 'F', gradePoint: 0 };
}

export function computeGraded(caScore: number, examScore: number): GradedResult {
  const totalScore = Math.round((caScore + examScore) * 100) / 100;
  const { grade, gradePoint } = gradeFor(totalScore);
  return { totalScore, grade, gradePoint };
}

export interface GpaComputationInput {
  results: Array<{ totalScore: number; gradePoint: number; course: { creditUnits: number } }>;
}

export function computeGpa(results: GpaComputationInput['results']): number {
  if (results.length === 0) return 0;
  let qualityPoints = 0;
  let totalUnits = 0;
  for (const r of results) {
    qualityPoints += r.gradePoint * r.course.creditUnits;
    totalUnits += r.course.creditUnits;
  }
  if (totalUnits === 0) return 0;
  return Math.round((qualityPoints / totalUnits) * 100) / 100;
}
