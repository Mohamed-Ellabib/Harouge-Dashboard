import { ItRequestModel } from "../../modules/it-requests/request.model";
import {
  buildRequestVisibilityFilter,
  buildTaskDirectVisibilityFilter,
  isEnterpriseAdmin
} from "./access-policies";
import type { AuthenticatedUserContext } from "./auth-context";

export function combineMongoFilters(
  ...filters: Array<Record<string, unknown>>
): Record<string, unknown> {
  const activeFilters = filters.filter(
    (filter) => Object.keys(filter).length > 0
  );

  if (activeFilters.length === 0) {
    return {};
  }

  if (activeFilters.length === 1) {
    return activeFilters[0] ?? {};
  }

  return {
    $and: activeFilters
  };
}

export async function buildTaskVisibilityFilterForActor(
  actor: AuthenticatedUserContext
): Promise<Record<string, unknown>> {
  if (isEnterpriseAdmin(actor)) {
    return {};
  }

  const directFilter = buildTaskDirectVisibilityFilter(actor);
  const clauses = extractOrClauses(directFilter);
  const visibleRequests = await ItRequestModel.find(
    buildRequestVisibilityFilter(actor)
  )
    .select("_id")
    .lean();

  if (visibleRequests.length > 0) {
    clauses.push({
      requestId: {
        $in: visibleRequests.map((request) => request._id)
      }
    });
  }

  return {
    $or: clauses
  };
}

function extractOrClauses(
  filter: Record<string, unknown>
): Record<string, unknown>[] {
  const clauses = filter.$or;

  if (Array.isArray(clauses)) {
    return clauses as Record<string, unknown>[];
  }

  return [filter];
}
