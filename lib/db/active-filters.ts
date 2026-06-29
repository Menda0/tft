import type { Document, Filter } from "mongodb";

export function notDeletedFilter(): Filter<Document> {
  return {
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  };
}

export function mergeNotDeleted<T extends Document>(
  filter: Filter<T>,
): Filter<T> {
  return {
    $and: [filter, notDeletedFilter()],
  } as Filter<T>;
}

export function mergeNotDeletedPost<T extends Document>(
  filter: Filter<T>,
): Filter<T> {
  return mergeNotDeleted(filter);
}
