import { useMemo } from "react";
import type { ModuleProgressRecord } from "../../api/client";
import type { AppLanguage } from "../../i18n/locale";
import type { TaskModuleDefinition } from "./taskModules";
import { moduleProgressKey } from "./moduleProgress";

type Props = {
  modules: TaskModuleDefinition[];
  percentages: ModuleProgressRecord[];
  disabled: boolean;
  language: AppLanguage;
  onChange: (module: string, subModule: string | undefined, value: number) => void;
};

export function ModuleProgressEditor({ modules, percentages, disabled, language, onChange }: Props) {
  const values = useMemo(() => new Map(percentages.map((entry) => [moduleProgressKey(entry.module, entry.subModule), entry.percentage])), [percentages]);
  const ar = language === "ar";
  function control(module: string, subModule?: string) {
    const value = values.get(moduleProgressKey(module, subModule)) ?? 0;
    const name = subModule ? `${module} / ${subModule}` : module;
    return <div className="module-progress-controls">
      <input type="range" min={0} max={100} step={1} value={value} disabled={disabled} aria-label={`${name} slider`}
        onChange={(event) => onChange(module, subModule, Number(event.target.value))} />
      <div className="project-progress-number-shell">
        <input type="number" min={0} max={100} step={1} required value={value} disabled={disabled} aria-label={`${name} percentage`}
          onChange={(event) => onChange(module, subModule, Math.min(100, Math.max(0, Number(event.target.value))))} />
        <span>%</span>
      </div>
    </div>;
  }
  return <section className="project-progress-sprints-panel module-progress-panel">
    <header><div>
      <h3>{ar ? "تقدم الوحدات" : "Module Progress"}</h3>
      <p>{ar ? "حدث نسب الوحدات والوحدات الفرعية لعرضها في لوحة لجنة الإدارة." : "Update module and submodule percentages for the Management Committee overview."}</p>
    </div></header>
    <div className="module-progress-list">
      {modules.map((module) => <article className="module-progress-group" key={module.name}>
        <div className="module-progress-row is-parent"><h4>{module.name}</h4>{control(module.name)}</div>
        <details>
          <summary>{ar ? "الوحدات الفرعية" : "Submodules"} <span>{module.subModules.length}</span></summary>
          {module.subModules.map((sub) => <div className="module-progress-row is-child" key={sub}><span>{sub}</span>{control(module.name, sub)}</div>)}
        </details>
      </article>)}
    </div>
  </section>;
}
