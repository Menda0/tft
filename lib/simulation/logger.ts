export type TickLogLevel = "info" | "warn" | "error" | "success";

export type TickLogEntry = {
  level: TickLogLevel;
  message: string;
  at: string;
};

export type SimulationLogFn = (level: TickLogLevel, message: string) => void;

export const noopSimulationLog: SimulationLogFn = () => {};

export function createSimulationLogger(
  onEntry: (entry: TickLogEntry) => void,
): SimulationLogFn {
  return (level, message) => {
    onEntry({
      level,
      message,
      at: new Date().toISOString(),
    });
  };
}

export function truncateForLog(text: string, max = 80): string {
  const trimmed = text.replace(/\s+/g, " ").trim();

  if (trimmed.length <= max) {
    return trimmed;
  }

  return `${trimmed.slice(0, max - 3)}...`;
}
