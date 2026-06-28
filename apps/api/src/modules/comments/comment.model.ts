import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type Types
} from "mongoose";

import { createCreatedAtOnlySchemaOptions } from "../../shared/database/schema-options";

export interface Comment {
  body: string;
  createdAt?: Date;
  createdBy?: Types.ObjectId;
  isInternal: boolean;
  requestId: Types.ObjectId;
}

export type CommentDocument = HydratedDocument<Comment>;

const commentSchema = new Schema<Comment>(
  {
    body: {
      required: true,
      trim: true,
      type: String
    },
    createdBy: {
      ref: "User",
      type: Schema.Types.ObjectId
    },
    isInternal: {
      default: false,
      required: true,
      type: Boolean
    },
    requestId: {
      ref: "ItRequest",
      required: true,
      type: Schema.Types.ObjectId
    }
  },
  createCreatedAtOnlySchemaOptions("comments")
);

commentSchema.index({ requestId: 1, createdAt: 1 });
commentSchema.index({ createdBy: 1 });
commentSchema.index({ createdAt: -1 });

export const CommentModel =
  (models.Comment as Model<Comment> | undefined) ??
  model<Comment>("Comment", commentSchema);
