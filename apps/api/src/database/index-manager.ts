import { databaseModels } from "./models";

export interface ModelIndexResult {
  indexes: string[];
  model: string;
}

export async function createDatabaseIndexes(): Promise<ModelIndexResult[]> {
  const results: ModelIndexResult[] = [];

  for (const databaseModel of databaseModels) {
    await databaseModel.createIndexes();
    const indexes = await databaseModel.collection.indexes();

    results.push({
      indexes: indexes
        .map((index) => index.name)
        .filter((name): name is string => Boolean(name)),
      model: databaseModel.modelName
    });
  }

  return results;
}
