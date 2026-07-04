import { connectDatabase, disconnectDatabase } from "./mongoose";
import {
  OVERALL_PROJECT_PROGRESS_KEY,
  ProjectProgressModel,
  defaultProjectProgressAreaWeights
} from "../modules/project-progress/project-progress.model";

async function run(): Promise<void> {
  await connectDatabase();

  const areaWeights = {
    ...defaultProjectProgressAreaWeights,
    development: 40,
    facility: 10,
    infrastructure: 20,
    master_data_collection: 30
  };

  const total =
    areaWeights.development +
    areaWeights.facility +
    areaWeights.infrastructure +
    areaWeights.master_data_collection;

  if (total !== 100) {
    throw new Error(`Area weights must add up to 100. Received ${total}.`);
  }

  const document = await ProjectProgressModel.findOneAndUpdate(
    { key: OVERALL_PROJECT_PROGRESS_KEY },
    {
      $set: {
        areaWeights
      },
      $setOnInsert: {
        key: OVERALL_PROJECT_PROGRESS_KEY,
        percentage: 0
      }
    },
    { new: true, upsert: true }
  );

  console.log(
    JSON.stringify(
      {
        key: document?.key,
        areaWeights: document?.areaWeights
      },
      null,
      2
    )
  );
}

run()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
