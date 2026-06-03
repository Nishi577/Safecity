import type { AppRole } from "./roleValidation";

export const DESIGNATIONS = [
  "Constable",
  "Head Constable",
  "Sub Inspector",
  "Inspector",
  "ACP / DSP",
  "SP / DCP",
] as const;

export type Designation = (typeof DESIGNATIONS)[number];

export function getRoleFromDesignation(designation: string): AppRole {
  switch (designation) {
    case "Constable":
    case "Head Constable":
    case "Sub Inspector":
      return "field_police";
    case "Inspector":
    case "ACP / DSP":
    case "SP / DCP":
      return "higher_officer";
    default:
      return "field_police";
  }
}
