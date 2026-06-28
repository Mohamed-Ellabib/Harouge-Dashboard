import {
  ClipboardCheck,
  FileText,
  Server,
  type LucideIcon
} from "lucide-react";

export type SprintAreaKey = "development" | "facility" | "infrastructure";

export type SprintAreaDefinition = {
  categories: readonly string[];
  icon: LucideIcon;
  key: SprintAreaKey;
  labelKey: string;
  tone: "blue" | "green" | "orange";
};

export const sprintAreaDefinitions: SprintAreaDefinition[] = [
  {
    categories: ["software", "access"],
    icon: ClipboardCheck,
    key: "development",
    labelKey: "dashboard.sprintAreas.development",
    tone: "blue"
  },
  {
    categories: ["hardware", "maintenance", "support"],
    icon: FileText,
    key: "facility",
    labelKey: "dashboard.sprintAreas.facility",
    tone: "orange"
  },
  {
    categories: ["network", "server", "other"],
    icon: Server,
    key: "infrastructure",
    labelKey: "dashboard.sprintAreas.infrastructure",
    tone: "green"
  }
];

export function getSprintAreaDefinition(
  key: string | undefined
): SprintAreaDefinition | undefined {
  return sprintAreaDefinitions.find((area) => area.key === key);
}

export function getSprintAreaByCategory(category: string): SprintAreaDefinition | undefined {
  return sprintAreaDefinitions.find((area) => area.categories.includes(category));
}
