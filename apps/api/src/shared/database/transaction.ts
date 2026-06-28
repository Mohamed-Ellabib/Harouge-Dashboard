import mongoose, { type ClientSession } from "mongoose";

export async function runInTransaction<T>(
  operation: (session: ClientSession) => Promise<T>
): Promise<T> {
  return mongoose.connection.transaction(operation, {
    readConcern: { level: "snapshot" },
    readPreference: "primary",
    writeConcern: { w: "majority" }
  });
}
