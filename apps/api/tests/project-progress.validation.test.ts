import { describe, expect, it } from "vitest";
import { ProjectProgressModel } from "../src/modules/project-progress/project-progress.model";
import { serializeProjectProgress } from "../src/modules/project-progress/project-progress.dto";
import { updateProjectProgressBodySchema } from "../src/modules/project-progress/project-progress.validation";

const percentages = { development: 83, facility: 0, infrastructure: 100, master_data_collection: 26 };

describe("Manual progress schema compatibility", () => {
  it("retains an existing overall percentage and defaults new sprint fields", () => {
    const record = ProjectProgressModel.hydrate({ key: "overall", percentage: 13 });
    const result = serializeProjectProgress(record);
    expect(result.percentage).toBe(13);
    expect(result.sprintPercentages).toEqual({ development: 0, facility: 0, infrastructure: 0, master_data_collection: 0 });
  });
  it("accepts independent percentages without requiring a total of 100", async () => {
    const body = updateProjectProgressBodySchema.parse({ percentage: 37, sprintPercentages: percentages });
    const record = new ProjectProgressModel(body);
    await expect(record.validate()).resolves.toBeUndefined();
    expect(serializeProjectProgress(record)).toMatchObject({ percentage: 37, sprintPercentages: percentages });
  });
  it("rejects out-of-range, fractional, null and incomplete sprint input", () => {
    for (const development of [-1, 101, 12.5, null, "50"]) {
      expect(updateProjectProgressBodySchema.safeParse({ sprintPercentages: { ...percentages, development } }).success).toBe(false);
    }
    expect(updateProjectProgressBodySchema.safeParse({ sprintPercentages: { development: 25 } }).success).toBe(false);
  });
  it("allows existing overall-only and note-only clients", () => {
    expect(updateProjectProgressBodySchema.parse({ percentage: 27 })).toEqual({ percentage: 27 });
    expect(updateProjectProgressBodySchema.parse({ note: "Report" })).toEqual({ note: "Report" });
  });
});


describe("Module progress", () => {
  it("keeps parents and same-named submodules independent", async () => {
    const modulePercentages = [
      { module: "FINANCE", percentage: 41 },
      { module: "FINANCE", subModule: "General", percentage: 100 },
      { module: "HUMAN RESOURCES", subModule: "General", percentage: 0 }
    ];
    const body = updateProjectProgressBodySchema.parse({ modulePercentages });
    const model = new ProjectProgressModel({ percentage: 18, ...body });
    await expect(model.validate()).resolves.toBeUndefined();
    expect(serializeProjectProgress(model)).toMatchObject({ percentage: 18, modulePercentages });
  });
  it("rejects duplicate identities and invalid percentages", () => {
    const entry = { module: "FINANCE", subModule: "General", percentage: 20 };
    expect(updateProjectProgressBodySchema.safeParse({ modulePercentages: [entry, entry] }).success).toBe(false);
    for (const percentage of [-1, 101, 2.5, null, "25"]) {
      expect(updateProjectProgressBodySchema.safeParse({ modulePercentages: [{ ...entry, percentage }] }).success).toBe(false);
    }
    expect(updateProjectProgressBodySchema.safeParse({ modulePercentages: [{ module: " ", percentage: 10 }] }).success).toBe(false);
  });
  it("defaults older records to an empty module list", () => {
    const record = ProjectProgressModel.hydrate({ key: "overall", percentage: 18 });
    expect(serializeProjectProgress(record).modulePercentages).toEqual([]);
  });
});
