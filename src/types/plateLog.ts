import type { PlateStatus } from "./plate";

export interface PlateLog {
  plate: string;
  status: PlateStatus;
  message: string;
  timestamp: string;
}
