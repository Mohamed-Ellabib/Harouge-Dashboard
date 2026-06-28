import type { CommentDocument } from "./comment.model";

export interface CommentDto {
  body: string;
  createdAt?: Date;
  createdBy?: string;
  id: string;
  isInternal: boolean;
  requestId: string;
}

export function serializeComment(comment: CommentDocument): CommentDto {
  return {
    body: comment.body,
    ...(comment.createdAt ? { createdAt: comment.createdAt } : {}),
    ...(comment.createdBy ? { createdBy: String(comment.createdBy) } : {}),
    id: String(comment._id),
    isInternal: comment.isInternal,
    requestId: String(comment.requestId)
  };
}
