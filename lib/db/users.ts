import { Collection, Filter, ObjectId } from "mongodb";
import { getAddress } from "viem";

import { getDb } from "@/lib/mongodb";

import { roleForUsername, type UserRole } from "@/lib/auth/admin";
import { getDefaultChainId } from "@/lib/nft/config";

const COLLECTION = "users";

export type LinkedWallet = {
  address: string;
  chainId: number;
  linkedAt: Date;
};

export type UserDocument = {
  _id?: ObjectId;
  username: string;
  passwordHash: string;
  createdAt: Date;
  lastAccessAt?: Date;
  isBootstrap?: boolean;
  linkedWallets?: LinkedWallet[];
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

const LAST_ACCESS_TOUCH_INTERVAL_MS = 15 * 60 * 1000;

export async function ensureUserIndexes(): Promise<void> {
  const collection = await getUsersCollection();
  await collection.createIndex({ username: 1 }, { unique: true });
  await collection.createIndex({ lastAccessAt: -1 });
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

export async function findUsersByIds(
  ids: string[],
): Promise<Map<string, UserDocument>> {
  const objectIds = [...new Set(ids)]
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  if (objectIds.length === 0) {
    return new Map();
  }

  const collection = await getUsersCollection();
  const users = await collection.find({ _id: { $in: objectIds } }).toArray();

  return new Map(
    users
      .filter((user) => user._id)
      .map((user) => [user._id!.toString(), user]),
  );
}

export async function createUser(
  username: string,
  passwordHash: string,
  options?: { isBootstrap?: boolean; lastAccessAt?: Date },
): Promise<UserDocument> {
  const collection = await getUsersCollection();
  const now = options?.lastAccessAt ?? new Date();
  const user: UserDocument = {
    username,
    passwordHash,
    createdAt: now,
    lastAccessAt: now,
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

export async function getUserCount(): Promise<number> {
  const collection = await getUsersCollection();
  return collection.countDocuments();
}

export async function setUserLastAccessAt(
  userId: string,
  lastAccessAt = new Date(),
): Promise<void> {
  if (!ObjectId.isValid(userId)) {
    return;
  }

  const collection = await getUsersCollection();
  await collection.updateOne(
    { _id: new ObjectId(userId) },
    { $set: { lastAccessAt } },
  );
}

export async function touchUserLastAccess(userId: string): Promise<void> {
  if (!ObjectId.isValid(userId)) {
    return;
  }

  const threshold = new Date(Date.now() - LAST_ACCESS_TOUCH_INTERVAL_MS);
  const collection = await getUsersCollection();

  await collection.updateOne(
    {
      _id: new ObjectId(userId),
      $or: [
        { lastAccessAt: { $exists: false } },
        { lastAccessAt: { $lte: threshold } },
      ],
    } satisfies Filter<UserDocument>,
    { $set: { lastAccessAt: new Date() } },
  );
}

export async function listUsersByLastAccess({
  offset,
  limit,
}: {
  offset: number;
  limit: number;
}): Promise<UserDocument[]> {
  const collection = await getUsersCollection();

  return collection
    .aggregate<UserDocument>([
      {
        $addFields: {
          _sortAccessAt: { $ifNull: ["$lastAccessAt", "$createdAt"] },
        },
      },
      { $sort: { _sortAccessAt: -1, _id: 1 } },
      { $skip: offset },
      { $limit: limit },
      { $project: { _sortAccessAt: 0 } },
    ])
    .toArray();
}

function normalizeLinkedWallet(wallet: LinkedWallet): LinkedWallet {
  return {
    address: getAddress(wallet.address),
    chainId: wallet.chainId,
    linkedAt:
      wallet.linkedAt instanceof Date
        ? wallet.linkedAt
        : new Date(wallet.linkedAt),
  };
}

export function normalizeLinkedWallets(
  wallets: LinkedWallet[] | undefined,
): LinkedWallet[] {
  if (!Array.isArray(wallets)) {
    return [];
  }

  return wallets.map(normalizeLinkedWallet);
}

export async function linkWalletForUser(
  userId: string,
  address: string,
  chainId = getDefaultChainId(),
): Promise<LinkedWallet[] | null> {
  if (!ObjectId.isValid(userId)) {
    return null;
  }

  const normalizedAddress = getAddress(address);
  const collection = await getUsersCollection();
  const user = await collection.findOne({ _id: new ObjectId(userId) });

  if (!user) {
    return null;
  }

  const existing = normalizeLinkedWallets(user.linkedWallets);
  const alreadyLinked = existing.some(
    (wallet) =>
      wallet.address.toLowerCase() === normalizedAddress.toLowerCase() &&
      wallet.chainId === chainId,
  );

  if (alreadyLinked) {
    return existing;
  }

  const linkedWallet: LinkedWallet = {
    address: normalizedAddress,
    chainId,
    linkedAt: new Date(),
  };

  await collection.updateOne(
    { _id: new ObjectId(userId) },
    { $push: { linkedWallets: linkedWallet } },
  );

  return [...existing, linkedWallet];
}

export async function unlinkWalletForUser(
  userId: string,
  address: string,
): Promise<LinkedWallet[] | null> {
  if (!ObjectId.isValid(userId)) {
    return null;
  }

  const normalizedAddress = getAddress(address).toLowerCase();
  const collection = await getUsersCollection();
  const user = await collection.findOne({ _id: new ObjectId(userId) });

  if (!user) {
    return null;
  }

  const remaining = normalizeLinkedWallets(user.linkedWallets).filter(
    (wallet) => wallet.address.toLowerCase() !== normalizedAddress,
  );

  await collection.updateOne(
    { _id: new ObjectId(userId) },
    { $set: { linkedWallets: remaining } },
  );

  return remaining;
}

export async function getLinkedWalletsForUser(
  userId: string,
): Promise<LinkedWallet[]> {
  const user = await findUserById(userId);
  return normalizeLinkedWallets(user?.linkedWallets);
}
