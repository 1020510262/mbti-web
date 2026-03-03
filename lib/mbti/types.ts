export type Dimension = "EI" | "SN" | "TF" | "JP";
export type Direction = "forward" | "reverse";

export type OptionValue = 0 | 1 | 2 | 3;

export interface Question {
  id: string;
  text: string;
  dimension: Dimension;
  direction: Direction;
  options: string[];
}

export interface AxisPercent {
  first: number;
  second: number;
}

export interface ScoreResult {
  type: string;
  axisScore: Record<Dimension, number>;
  axisPercent: Record<Dimension, AxisPercent>;
}

export interface MbtiProfile {
  code: string;
  title: string;
  summary: string;
  strengths: string[];
  blindSpots: string[];
}
