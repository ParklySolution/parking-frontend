export type PlateStatus = "SUBSCRIBER" | "OCCASIONAL" | "BLOCKED";

export interface PlateDecision {
  plate: string;
  status: PlateStatus;
  message: string;
}
