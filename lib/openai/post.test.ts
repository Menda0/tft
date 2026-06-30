import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildReplyPrompt } from "@/lib/openai/reply-prompt";
import type { Personality } from "@/lib/types/personality";
import type { Post } from "@/lib/types/post";

function personality(): Personality {
  return {
    id: "p1",
    name: "Reader",
    handle: "reader",
    kind: "person",
    gender: "male",
    pronouns: "he_him",
    avatarUrl: null,
    avatarStatus: "ready",
    description: null,
    descriptionStatus: "ready",
    ownerId: "owner",
    createdAt: new Date(),
    archetype: null,
    traits: {
      humor: 5,
      aggression: 8,
      troll: 5,
      woke: 5,
      negacionist: 5,
      radical: 5,
    },
    politicalSwing: 0,
    interests: ["tech"],
    beliefs: {},
    stats: {
      followers: 0,
      socialScore: 0,
      controversy: 0,
      creativity: 0,
    },
    memory: [],
    relationships: {},
  };
}

function post(): Post {
  return {
    id: "post1",
    author: {
      personalityId: "a1",
      name: "Author",
      handle: "author",
      archetype: "",
      avatarUrl: null,
    },
    content: "Hot take on the timeline.",
    topic: "AI",
    createdAt: new Date(),
    tickNumber: 1,
    stats: {
      replies: 0,
      reposts: 0,
      likes: 0,
      views: 0,
      agreeReplies: 0,
      disagreeReplies: 0,
    },
    replyToPostId: null,
    repostOfPostId: null,
  };
}

describe("buildReplyPrompt", () => {
  it("includes feud guidance for intense disagree context", () => {
    const prompt = buildReplyPrompt(personality(), post(), "disagree", {
      targetAuthor: { name: "Author", handle: "author" },
      relationship: {
        trust: 2,
        rivalry: 8,
        admiration: 1,
        familiarity: 5,
      },
      category: "nemesis",
      categoryLabel: "Nemesis",
      disagreeIntensity: 1.8,
    });

    assert.match(prompt, /Nemesis/);
    assert.match(prompt, /ongoing feud/i);
    assert.match(prompt, /sharp feud energy/i);
  });

  it("includes supportive guidance for agree ally context", () => {
    const prompt = buildReplyPrompt(personality(), post(), "agree", {
      targetAuthor: { name: "Author", handle: "author" },
      relationship: {
        trust: 8,
        rivalry: 1,
        admiration: 8,
        familiarity: 6,
      },
      category: "ally",
      categoryLabel: "Ally",
      agreeIntensity: 1.3,
    });

    assert.match(prompt, /Ally/);
    assert.match(prompt, /enthusiastic ally energy/i);
  });
});
