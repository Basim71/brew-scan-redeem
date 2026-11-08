import { describe, expect, it } from "vitest";
import { checkToken, parseToken, type CustomerToken } from "./offline-queue";

const base: CustomerToken = {
  v: 1, sid: "s1", name: "A", plan: "P", max: 2, used_today: 1,
  day: "2026-11-07", nonce: "n1", exp: 2000,
};
const ctx = { now: 1000 * 1000, today: "2026-11-07", localUsed: 0, usedNonces: [] as string[] };

describe("offline token rules", () => {
  it("allows a second cup when plan allows 2", () => expect(checkToken(base, ctx)).toBeNull());
  it("blocks when daily cups are used up locally", () =>
    expect(checkToken(base, { ...ctx, localUsed: 2 })).toBe("limit"));
  it("rejects expired codes", () => expect(checkToken({ ...base, exp: 500 }, ctx)).toBe("expired"));
  it("rejects reused codes", () => expect(checkToken(base, { ...ctx, usedNonces: ["n1"] })).toBe("reused"));
  it("rejects another day", () => expect(checkToken(base, { ...ctx, today: "2026-11-08" })).toBe("otherDay"));
  it("parses base64 JSON", () => expect(parseToken(btoa(JSON.stringify(base)))?.sid).toBe("s1"));
});
