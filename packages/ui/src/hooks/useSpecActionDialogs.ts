import { useState, useCallback, useEffect } from 'react';
import type { SpecTokenResponse, SpecValidationResponse } from '../types/api';
import { getBackend } from '../lib/backend-adapter';

export function useSpecActionDialogs(projectId?: string) {
  const [activeSpecName, setActiveSpecName] = useState<string | null>(null);

  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [tokenDialogLoading, setTokenDialogLoading] = useState(false);
  const [tokenDialogData, setTokenDialogData] = useState<SpecTokenResponse | null>(null);

  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationDialogLoading, setValidationDialogLoading] = useState(false);
  const [validationDialogData, setValidationDialogData] = useState<SpecValidationResponse | null>(null);

  const backend = getBackend();

  const closeTokenDialog = useCallback(() => {
    setTokenDialogOpen(false);
    setTokenDialogLoading(false);
    setTokenDialogData(null);
  }, []);

  const closeValidationDialog = useCallback(() => {
    setValidationDialogOpen(false);
    setValidationDialogLoading(false);
    setValidationDialogData(null);
  }, []);

  const handleTokenClick = useCallback((specName: string) => {
    if (!projectId) return;
    setActiveSpecName(specName);
    setTokenDialogOpen(true);
  }, [projectId]);

  const handleValidationClick = useCallback((specName: string) => {
    if (!projectId) return;
    setActiveSpecName(specName);
    setValidationDialogOpen(true);
  }, [projectId]);

  useEffect(() => {
    if (!tokenDialogOpen || !activeSpecName || !projectId) return;
    setTokenDialogLoading(true);
    backend.getSpecTokens(projectId, activeSpecName)
      .then((data) => setTokenDialogData(data))
      .catch(() => setTokenDialogData(null))
      .finally(() => setTokenDialogLoading(false));
  }, [activeSpecName, backend, projectId, tokenDialogOpen]);

  useEffect(() => {
    if (!validationDialogOpen || !activeSpecName || !projectId) return;
    setValidationDialogLoading(true);
    backend.getSpecValidation(projectId, activeSpecName)
      .then((data) => setValidationDialogData(data))
      .catch(() => setValidationDialogData(null))
      .finally(() => setValidationDialogLoading(false));
  }, [activeSpecName, backend, projectId, validationDialogOpen]);

  return {
    activeSpecName,

    tokenDialogOpen,
    tokenDialogLoading,
    tokenDialogData,
    closeTokenDialog,
    handleTokenClick,

    validationDialogOpen,
    validationDialogLoading,
    validationDialogData,
    closeValidationDialog,
    handleValidationClick,
  };
}
