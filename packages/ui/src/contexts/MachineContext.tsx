import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, APIError } from '../lib/api';
import type { Machine, MachinesResponse } from '../types/api';

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
  const [machines, setMachines] = useState<Machine[]>([]);
  const [currentMachine, setCurrentMachine] = useState<Machine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [machineModeEnabled, setMachineModeEnabled] = useState(false);

  const applyMachines = useCallback((data: MachinesResponse) => {
    const nextMachines = data.machines || [];
    setMachines(nextMachines);

    if (nextMachines.length === 0) {
      setCurrentMachine(null);
      api.setCurrentMachineId(null);
      return;
    }

    const storedId = localStorage.getItem(STORAGE_KEY);
    const selected = (storedId ? nextMachines.find((machine) => machine.id === storedId) : null) || nextMachines[0];
    setCurrentMachine(selected);
    api.setCurrentMachineId(selected?.id ?? null);
    if (selected) {
      localStorage.setItem(STORAGE_KEY, selected.id);
    }
  }, []);

  const refreshMachines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMachines();
      setMachineModeEnabled(true);
      applyMachines(data);
    } catch (err) {
      if (err instanceof APIError && err.status === 404) {
        setMachineModeEnabled(false);
        setMachines([]);
        setCurrentMachine(null);
        api.setCurrentMachineId(null);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load machines');
      }
    } finally {
      setLoading(false);
    }
  }, [applyMachines]);

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

  useEffect(() => {
    refreshMachines();
  }, [refreshMachines]);

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
