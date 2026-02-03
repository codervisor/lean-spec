import { create } from 'zustand';
import { api } from '../lib/api';
import type { Machine } from '../types/api';

interface MachineState {
  machineModeEnabled: boolean;
  machines: Machine[];
  currentMachine: Machine | null;
  loading: boolean;
  error: string | null;
  refreshMachines: () => Promise<void>;
  selectMachine: (machineId: string) => void;
  renameMachine: (machineId: string, label: string) => Promise<void>;
  revokeMachine: (machineId: string) => Promise<void>;
  requestExecution: (machineId: string, payload: Record<string, unknown>) => Promise<void>;
  isMachineAvailable: () => boolean;
}

const STORAGE_KEY = 'leanspec-current-machine';

export const useMachineStore = create<MachineState>((set, get) => ({
  machines: [],
  currentMachine: null,
  loading: false,
  error: null,
  machineModeEnabled: false,
  refreshMachines: async () => {
    // Machine/cloud features are currently disabled.
    return;
  },
  selectMachine: (machineId: string) => {
    const machine = get().machines.find((item) => item.id === machineId) || null;
    set({ currentMachine: machine });
    api.setCurrentMachineId(machine?.id ?? null);
    if (machine) {
      localStorage.setItem(STORAGE_KEY, machine.id);
    }
  },
  renameMachine: async (machineId: string, label: string) => {
    await api.renameMachine(machineId, label);
    await get().refreshMachines();
  },
  revokeMachine: async (machineId: string) => {
    await api.revokeMachine(machineId);
    await get().refreshMachines();
  },
  requestExecution: async (machineId: string, payload: Record<string, unknown>) => {
    await api.requestExecution(machineId, payload);
  },
  isMachineAvailable: () => {
    const { machineModeEnabled, currentMachine } = get();
    if (!machineModeEnabled) return true;
    if (!currentMachine) return false;
    return currentMachine.status === 'online';
  },
}));
