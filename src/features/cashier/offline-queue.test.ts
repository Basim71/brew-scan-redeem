import { beforeAll, describe, expect, it } from "vitest";
import { checkToken, parseToken, tokenMessage, verifyTokenSignature, type DeviceKey, type CustomerToken } from "./offline-queue";

const base: CustomerToken = {
  v: 1, sid: "00000000-0000-0000-0000-000000000001", cid: "00000000-0000-0000-0000-000000000002",
  kid: "00000000-0000-0000-0000-000000000003", sig: "placeholder", name: "A", plan: "P", max: 2, used_today: 1,
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
  it("parses base64 JSON", () => expect(parseToken(btoa(JSON.stringify(base)))?.sid).toBe(base.sid));
  it("rejects missing signature", () => expect(parseToken(JSON.stringify({ ...base, sig: undefined }))).toBeNull());
  it("rejects missing customer id", () => expect(parseToken(JSON.stringify({ ...base, cid: undefined }))).toBeNull());
  it("rejects missing key id", () => expect(parseToken(JSON.stringify({ ...base, kid: undefined }))).toBeNull());
  it("rejects nonfinite cup limits", () => expect(checkToken({ ...base, max: NaN }, ctx)).toBe("invalid"));
  it("rejects at exact expiry", () => expect(checkToken({ ...base, exp: 1000 }, ctx)).toBe("expired"));
});

describe("P-256 offline signature contract", () => {
  let signed: CustomerToken;
  let keys: DeviceKey[];
  beforeAll(async () => {
    const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const publicKey = await crypto.subtle.exportKey("spki", pair.publicKey);
    const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, pair.privateKey,
      new TextEncoder().encode(tokenMessage(base)));
    signed = { ...base, sig: btoa(String.fromCharCode(...new Uint8Array(signature))) };
    keys = [{ customer_id: base.cid, key_id: base.kid, public_key: btoa(String.fromCharCode(...new Uint8Array(publicKey))) }];
  });
  it("verifies a raw 64-byte signature over KOB1 fields", async () => expect(await verifyTokenSignature(signed, keys)).toBeNull());
  it("rejects altered daily limit", async () => expect(await verifyTokenSignature({ ...signed, max: 3 }, keys)).toBe("badSignature"));
  it("rejects altered cup usage", async () => expect(await verifyTokenSignature({ ...signed, used_today: 0 }, keys)).toBe("badSignature"));
  it("rejects altered subscription", async () => expect(await verifyTokenSignature({ ...signed, sid: base.cid }, keys)).toBe("badSignature"));
  it("rejects unregistered key", async () => expect(await verifyTokenSignature(signed, [])).toBe("unknownKey"));
  it("binds key to same customer", async () => expect(await verifyTokenSignature(signed, [{ ...keys[0], customer_id: base.sid }])).toBe("unknownKey"));
  it("rejects non-raw signatures", async () => expect(await verifyTokenSignature({ ...signed, sig: btoa("invalid") }, keys)).toBe("badSignature"));
  it("does not authenticate name and plan display labels", async () => expect(await verifyTokenSignature({ ...signed, name: "Display", plan: "Display" }, keys)).toBeNull());
});
