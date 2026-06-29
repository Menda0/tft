import { Collection, ObjectId } from "mongodb";

import { getDb } from "@/lib/mongodb";

import { roleForUsername, type UserRole } from "@/lib/auth/admin";

const COLLECTION = "users";

export type UserDocument = {
  _id?: ObjectId;
  username: string;
  passwordHash: string;
  createdAt: Date;
  isBootstrap?: boolean;
};

export type { UserRole };

export type PublicUser = {
  id: string;
  username: string;
  role: UserRole;
};

export async function getUsersCollection(): Promise<Collection<UserDocument>> {
  const db = await getDb();
  return db.collection<UserDocument>(COLLECTION);
}

export async function ensureUserIndexes(): Promise<void> {
  const collection = await getUsersCollection();
  await collection.createIndex({ username: 1 }, { unique: true });
}

export async function findUserByUsername(
  username: string,
): Promise<UserDocument | null> {
  const collection = await getUsersCollection();
  return collection.findOne({ username });
}

export async function findBootstrapUsers(): Promise<UserDocument[]> {
  const collection = await getUsersCollection();
  return collection
    .find({ isBootstrap: true })
    .sort({ createdAt: 1 })
    .toArray();
}

export async function findUserById(id: string): Promise<UserDocument | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const collection = await getUsersCollection();
  return collection.findOne({ _id: new ObjectId(id) });
}

export async function createUser(
  username: string,
  passwordHash: string,
  options?: { isBootstrap?: boolean },
): Promise<UserDocument> {
  const collection = await getUsersCollection();
  const user: UserDocument = {
    username,
    passwordHash,
    createdAt: new Date(),
    ...(options?.isBootstrap ? { isBootstrap: true } : {}),
  };

  const result = await collection.insertOne(user);
  return { ...user, _id: result.insertedId };
}

export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user._id!.toString(),
    username: user.username,
    role: roleForUsername(user.username),
  };
}
