export const RIEGEL_EXPONENT = 1.06;

/** Standard cross-distance time-prediction formula. Units-agnostic as long as d1/d2 are consistent. */
export function riegelPredictTime(t1Seconds: number, d1: number, d2: number, exponent = RIEGEL_EXPONENT): number {
  return t1Seconds * Math.pow(d2 / d1, exponent);
}

export function riegelPredictPace(t1Seconds: number, d1: number, d2: number, exponent = RIEGEL_EXPONENT): number {
  return riegelPredictTime(t1Seconds, d1, d2, exponent) / d2;
}
