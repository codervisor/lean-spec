import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { Machine } from '../types/api';

interface MachineContextValue {
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
  isMachineAvailable: boolean;
}

const MachineContext = createContext<MachineContextValue | null>(null);

const STORAGE_KEY = 'leanspec-current-machine';

export function MachineProvider({ children }: { children: ReactNode }) {
  const [machines] = useState<Machine[]>([]);
  const [currentMachine, setCurrentMachine] = useState<Machine | null>(null);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);
  const [machineModeEnabled] = useState(false);

  const refreshMachines = useCallback(async () => {
    // Machine/cloud features are currently disabled
    // States are already initialized to disabled state, no need to update
    return;

    // Original implementation (disabled):
    // setLoading(true);
    // setError(null);
    // try {
    //   const data = await api.getMachines();
    //   setMachineModeEnabled(true);
    //   applyMachines(data);
    // } catch (err) {
    //   if (err instanceof APIError && err.status === 404) {
    //     setMachineModeEnabled(false);
    //     setMachines([]);
    //     setCurrentMachine(null);
    //     api.setCurrentMachineId(null);
    //   } else {
    //     setError(err instanceof Error ? err.message : 'Failed to load machines');
    //   }
    // } finally {
    //   setLoading(false);
    // }
  }, []);

  const selectMachine = useCallback((machineId: string) => {
    const machine = machines.find((item) => item.id === machineId) || null;
    setCurrentMachine(machine);
    api.setCurrentMachineId(machine?.id ?? null);
    if (machine) {
      localStorage.setItem(STORAGE_KEY, machine.id);
    }
  }, [machines]);

  const renameMachine = useCallback(async (machineId: string, label: string) => {
    await api.renameMachine(machineId, label);
    await refreshMachines();
  }, [refreshMachines]);

  const revokeMachine = useCallback(async (machineId: string) => {
    await api.revokeMachine(machineId);
    await refreshMachines();
  }, [refreshMachines]);

  const requestExecution = useCallback(async (machineId: string, payload: Record<string, unknown>) => {
    await api.requestExecution(machineId, payload);
  }, []);

  const isMachineAvailable = useMemo(() => {
    if (!machineModeEnabled) return true;
    if (!currentMachine) return false;
    return currentMachine.status === 'online';
  }, [currentMachine, machineModeEnabled]);

  return (
    <MachineContext.Provider
      value={{
        machineModeEnabled,
        machines,
        currentMachine,
        loading,
        error,
        refreshMachines,
        selectMachine,
        renameMachine,
        revokeMachine,
        requestExecution,
        isMachineAvailable,
      }}
    >
      {children}
    </MachineContext.Provider>
  );
}

export function useMachine() {
  const context = useContext(MachineContext);
  if (!context) {
    throw new Error('useMachine must be used within a MachineProvider');
  }
  return context;
}
