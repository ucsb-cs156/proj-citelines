import { createContext } from "react";

// Session-scoped toggles for Admin/Instructor authoring & debugging tools.
// Adding a new tool = add a key here (with its default) and a checkbox in
// Footer.tsx; storage, role-gating, and clamping are handled once by
// StaffToolsProvider.
export interface StaffToolSettings {
  // Show a JSON tooltip with each concept-graph node's full backing data.
  debugMode: boolean;
  // Enable in-graph authoring affordances such as concept CRUD actions and
  // subconcept reordering.
  enableEditing: boolean;
}

export const DEFAULT_STAFF_TOOL_SETTINGS: StaffToolSettings = {
  debugMode: false,
  enableEditing: false,
};

export interface StaffToolsContextType extends StaffToolSettings {
  canUseStaffTools: boolean;
  setStaffTool: (tool: keyof StaffToolSettings, value: boolean) => void;
  newConceptHandler: (() => void) | null;
  registerNewConceptHandler: (handler: (() => void) | null) => void;
  realignConceptsHandler: (() => void) | null;
  registerRealignConceptsHandler: (handler: (() => void) | null) => void;
}

// The default (no provider mounted, e.g. on non-graph pages) is "no tools":
// flags off and canUseStaffTools false, which also hides the Footer toggles.
export const StaffToolsContext = createContext<StaffToolsContextType>({
  ...DEFAULT_STAFF_TOOL_SETTINGS,
  canUseStaffTools: false,
  setStaffTool: () => {},
  newConceptHandler: null,
  registerNewConceptHandler: () => {},
  realignConceptsHandler: null,
  registerRealignConceptsHandler: () => {},
});
