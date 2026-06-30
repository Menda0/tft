import {
  simulationConfig,
  type SimulationConfig,
} from "@/config/simulation";

export { simulationConfig, type SimulationConfig };

export function getSimulationConfig(): SimulationConfig {
  return simulationConfig;
}
