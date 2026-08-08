import { useCallback, useState, type ReactNode } from "react";
import { useCurrentUser, hasRole } from "main/utils/currentUser";
import {
  DEFAULT_STAFF_TOOL_SETTINGS,
  StaffToolsContext,
  type StaffToolSettings,
} from "main/utils/staffToolsContext";

const STORAGE_KEY = "staffTools";

function readStoredSettings(): StaffToolSettings {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "");
    return {
      debugMode: parsed.debugMode === true,
      enableEditing: parsed.enableEditing === true,
    };
  } catch {
    // No stored value, corrupt JSON, or sessionStorage unavailable
    // (e.g. blocked by browser settings): start from the defaults.
    return DEFAULT_STAFF_TOOL_SETTINGS;
  }
}

// Provides the session-scoped Admin/Instructor tool toggles (see
// StaffToolSettings). Mount it only on the pages whose content the tools act
// on (the concept-graph pages); everywhere else the context's default keeps
// the tools off and the Footer toggles hidden. The flags are clamped to false
// for regular users even if sessionStorage says otherwise, and the toggles
// persist for the lifetime of the browser tab (sessionStorage), never
// server-side.
export function StaffToolsProvider({ children }: { children: ReactNode }) {
  const currentUser = useCurrentUser();
  const canUseStaffTools =
    hasRole(currentUser, "ROLE_ADMIN") ||
    hasRole(currentUser, "ROLE_INSTRUCTOR");

  const [settings, setSettings] =
    useState<StaffToolSettings>(readStoredSettings);
  const [newConceptHandler, setNewConceptHandler] = useState<
    (() => void) | null
  >(null);

  const registerNewConceptHandler = useCallback(
    (handler: (() => void) | null) => {
      setNewConceptHandler(() => handler);
    },
    [],
  );

  const [realignConceptsHandler, setRealignConceptsHandler] = useState<
    (() => void) | null
  >(null);

  const registerRealignConceptsHandler = useCallback(
    (handler: (() => void) | null) => {
      setRealignConceptsHandler(() => handler);
    },
    [],
  );

  const setStaffTool = (tool: keyof StaffToolSettings, value: boolean) => {
    const next = { ...settings, [tool]: value };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // sessionStorage not available; the toggle still works for this render
      // tree, it just won't survive a reload.
    }
    setSettings(next);
  };

  return (
    <StaffToolsContext.Provider
      value={{
        debugMode: canUseStaffTools && settings.debugMode,
        enableEditing: canUseStaffTools && settings.enableEditing,
        canUseStaffTools,
        setStaffTool,
        newConceptHandler,
        registerNewConceptHandler,
        realignConceptsHandler,
        registerRealignConceptsHandler,
      }}
    >
      {children}
    </StaffToolsContext.Provider>
  );
}
