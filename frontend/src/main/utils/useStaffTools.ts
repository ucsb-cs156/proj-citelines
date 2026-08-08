import { useContext } from "react";
import {
  StaffToolsContext,
  type StaffToolsContextType,
} from "main/utils/staffToolsContext";

export function useStaffTools(): StaffToolsContextType {
  return useContext(StaffToolsContext);
}
