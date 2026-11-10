import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PGlite();
const orgA = "00000000-0000-0000-0000-00000000000a";
const orgB = "00000000-0000-0000-0000-00000000000b";
const branchA = "00000000-0000-0000-0000-0000000000a1";
const branchB = "00000000-0000-0000-0000-0000000000b1";
const owner = "00000000-0000-0000-0000-000000000001";
const admin = "00000000-0000-0000-0000-000000000002";
const cashier = "00000000-0000-0000-0000-000000000003";
const cashierB = "00000000-0000-0000-0000-000000000004";

const as = (uid: string) => db.exec(`select set_config('t.uid','${uid}',false)`);
const fn = (sql: string, name: string) => {
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
  const end = sql.indexOf("$$;", sql.indexOf("AS $$", start)) + 3;
  return sql.slice(start, end);
};
async function fails(q: string) {
  try { await db.exec(q); return null; } catch (e) { return (e as Error).message; }
}

beforeAll(async () => {
  await db.exec(`
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('t.uid',true),'')::uuid $$;
    CREATE FUNCTION public.is_platform_user() RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE FUNCTION public.scan_phone_key(p text) RETURNS text LANGUAGE sql AS $$ SELECT nullif(right(regexp_replace(coalesce(p,''),'\\D','','g'),9),'') $$;
    CREATE TABLE organizations(id uuid primary key, status text default 'active');
    CREATE TABLE branches(id uuid, organization_id uuid, name_en text, name_ar text, is_active boolean);
    CREATE TABLE organization_members(id uuid default gen_random_uuid(), organization_id uuid, user_id uuid, role text, status text default 'active', branch_id uuid, permissions jsonb default '{}');
    CREATE TABLE customer_scan_sessions(token_hash text, phone text, branch_id uuid, expires_at timestamptz);
    CREATE TABLE customers(id uuid default gen_random_uuid(), organization_id uuid, name text, phone text, email text);
    CREATE FUNCTION public.has_organization_role(o uuid, r text[]) RETURNS boolean LANGUAGE sql AS $$
      SELECT exists(select 1 from organization_members m where m.organization_id=o and m.user_id=auth.uid() and m.status='active' and m.role=any(r)) $$;
    INSERT INTO organizations VALUES('${orgA}'),('${orgB}');
    INSERT INTO branches VALUES('${branchA}','${orgA}','A','أ',true),('${branchB}','${orgB}','B','ب',true);
    INSERT INTO organization_members(organization_id,user_id,role,branch_id) VALUES
      ('${orgA}','${owner}','owner',null),('${orgA}','${admin}','admin',null),
      ('${orgA}','${cashier}','cashier','${branchA}'),('${orgB}','${cashierB}','cashier','${branchB}');
  `);
  const sql = readFileSync("drizzle/migrations/0030_security_hardening_tenant_isolation.sql", "utf8");
  for (const name of ["scan_session_is_valid", "organization_members_guard", "cashier_register_customer"]) await db.exec(fn(sql, name));
  await db.exec(`CREATE TRIGGER g BEFORE INSERT OR UPDATE OR DELETE ON organization_members FOR EACH ROW EXECUTE FUNCTION public.organization_members_guard()`);
}, 30000);
afterAll(async () => { await db.close(); });

describe("scan session staff bypass", () => {
  it("accepts staff for their own branch", async () => {
    await as(cashier);
    const r = await db.query<{ v: boolean }>(`select public.scan_session_is_valid(null,'0500000000','${branchA}') v`);
    expect(r.rows[0].v).toBe(true);
  });
  it("rejects staff from another company", async () => {
    await as(cashierB);
    const r = await db.query<{ v: boolean }>(`select public.scan_session_is_valid(null,'0500000000','${branchA}') v`);
    expect(r.rows[0].v).toBe(false);
  });
});

describe("organization member guard", () => {
  it("blocks admin promoting themselves to owner", async () => {
    await as(admin);
    expect(await fails(`update organization_members set role='owner' where user_id='${admin}'`)).toMatch(/only_owner/);
  });
  it("blocks admin promoting a cashier to owner", async () => {
    await as(admin);
    expect(await fails(`update organization_members set role='owner' where user_id='${cashier}'`)).toMatch(/only_owner/);
  });
  it("blocks admin changing own permissions", async () => {
    await as(admin);
    expect(await fails(`update organization_members set permissions='{"x":1}' where user_id='${admin}'`)).toMatch(/cannot_change_own/);
  });
  it("blocks admin editing the owner row", async () => {
    await as(admin);
    expect(await fails(`update organization_members set job_title_x=1 where user_id='${owner}'`.replace("job_title_x=1", "status='inactive'"))).toMatch(/cannot_modify_owner/);
  });
  it("blocks removing the last owner", async () => {
    await as(owner);
    expect(await fails(`delete from organization_members where user_id='${owner}'`)).toMatch(/last_owner/);
  });
  it("lets the owner promote to admin", async () => {
    await as(owner);
    expect(await fails(`update organization_members set role='admin' where user_id='${cashier}'`)).toBeNull();
    await db.exec(`update organization_members set role='cashier' where user_id='${cashier}'`);
  });
});

describe("cashier customer registration", () => {
  it("registers once and returns the same customer for a duplicate phone", async () => {
    await as(cashier);
    const a = await db.query<{ id: string }>(`select public.cashier_register_customer('${orgA}','Sara Ali','0551234567') id`);
    const b = await db.query<{ id: string }>(`select public.cashier_register_customer('${orgA}','Sara Ali','+966551234567') id`);
    expect(b.rows[0].id).toBe(a.rows[0].id);
  });
  it("rejects invalid phone numbers", async () => {
    await as(cashier);
    expect(await fails(`select public.cashier_register_customer('${orgA}','Sara','12345')`)).toMatch(/invalid_phone/);
  });
  it("rejects staff of another company", async () => {
    await as(cashierB);
    expect(await fails(`select public.cashier_register_customer('${orgA}','Sara','0551234568')`)).toMatch(/not_organization_member/);
  });
});
