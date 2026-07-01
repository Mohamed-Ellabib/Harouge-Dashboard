import {
  ClipboardCheck,
  Database,
  FileText,
  Server,
  type LucideIcon
} from "lucide-react";

export type SprintAreaKey =
  | "development"
  | "facility"
  | "infrastructure"
  | "master_data_collection";

export type SprintAreaDefinition = {
  categories: readonly string[];
  icon: LucideIcon;
  key: SprintAreaKey;
  labelKey: string;
  tone: "blue" | "green" | "orange" | "purple";
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
    categories: ["network", "server"],
    icon: Server,
    key: "infrastructure",
    labelKey: "dashboard.sprintAreas.infrastructure",
    tone: "green"
  },
  {
    categories: ["other"],
    icon: Database,
    key: "master_data_collection",
    labelKey: "dashboard.sprintAreas.masterDataCollection",
    tone: "purple"
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
