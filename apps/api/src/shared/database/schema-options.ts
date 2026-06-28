import type { SchemaOptions } from "mongoose";

type SerializedDocument = Record<string, unknown> & {
  __v?: unknown;
  _id?: unknown;
  id?: unknown;
};

export function normalizeSerializedDocument(
  _document: unknown,
  serialized: unknown
): SerializedDocument {
  const normalized = serialized as SerializedDocument;

  if (normalized._id) {
    normalized.id = String(normalized._id);
  }

  delete normalized._id;
  delete normalized.__v;

  return normalized;
}

export function createSchemaOptions(collection: string): SchemaOptions {
  return {
    collection,
    optimisticConcurrency: true,
    strict: true,
    timestamps: true,
    toJSON: {
      transform: normalizeSerializedDocument,
      virtuals: true
    },
    toObject: {
      transform: normalizeSerializedDocument,
      virtuals: true
    },
    versionKey: "__v"
  };
}

export function createCreatedAtOnlySchemaOptions(
  collection: string
): SchemaOptions {
  return {
    collection,
    strict: true,
    timestamps: {
      createdAt: true,
      updatedAt: false
    },
    toJSON: {
      transform: normalizeSerializedDocument,
      virtuals: true
    },
    toObject: {
      transform: normalizeSerializedDocument,
      virtuals: true
    },
    versionKey: false
  };
}
