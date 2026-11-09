import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PGlite();
const sub = "00000000-0000-0000-0000-000000000001";
const branch = "00000000-0000-0000-0000-000000000002";
const drink = "00000000-0000-0000-0000-000000000003";
const org = "00000000-0000-0000-0000-000000000004";
const plan = "00000000-0000-0000-0000-000000000005";
const customer = "00000000-0000-0000-0000-000000000006";

async function sync(id: string) {
  const result = await db.query<{ result: { synced: number; duplicates: number; results: { reason?: string }[] } }>(
    "select public.cashier_sync_offline_orders($1::jsonb) result", [JSON.stringify([{
      offline_sync_id: id, subscription_id: sub, branch_id: branch, drink_type_id: drink,
      served_at: new Date().toISOString(), selected_options: [],
    }])]);
  return result.rows[0].result;
}

beforeAll(async () => {
  await db.exec(`
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${customer}'::uuid $$;
    CREATE FUNCTION public.can_manage_org(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT $1='${org}'::uuid $$;
    CREATE FUNCTION public.has_organization_role(uuid,text[]) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE FUNCTION public.current_user_branch() RETURNS uuid LANGUAGE sql AS $$ SELECT '${branch}'::uuid $$;
    CREATE FUNCTION public.branch_shares_subscription(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT $1=$2 $$;
    CREATE TABLE branches(id uuid, organization_id uuid, is_active boolean);
    CREATE TABLE subscriptions(id uuid,customer_id uuid,organization_id uuid,branch_id uuid,plan_id uuid,status text,start_date date,end_date date);
    CREATE TABLE plans(id uuid,organization_id uuid,max_drinks_per_day integer);
    CREATE TABLE plan_allowed_branches(plan_id uuid,branch_id uuid,mode text);
    CREATE TABLE plan_allowed_drinks(plan_id uuid,drink_type_id uuid);
    CREATE TABLE drink_types(id uuid,organization_id uuid,is_active boolean);
    CREATE TABLE orders(id uuid DEFAULT gen_random_uuid(),subscription_id uuid,customer_id uuid,branch_id uuid,drink_type_id uuid,order_date date,status text,requested_at timestamptz,cashier_id uuid,organization_id uuid,selected_options jsonb,customer_note text,placed_via text,offline_sync_id uuid UNIQUE,is_offline_order boolean,offline_served_at timestamptz,approved_at timestamptz,fulfillment_stage text,picked_up_at timestamptz);
    INSERT INTO branches VALUES('${branch}','${org}',true);
    INSERT INTO subscriptions VALUES('${sub}','${customer}','${org}','${branch}','${plan}','active',CURRENT_DATE-1,CURRENT_DATE+1);
    INSERT INTO plans VALUES('${plan}','${org}',2);
    INSERT INTO drink_types VALUES('${drink}','${org}',true);
  `);
  const sql = readFileSync("drizzle/migrations/0024_offline_device_keys_and_daily_limit.sql", "utf8");
  const start = sql.indexOf("CREATE OR REPLACE FUNCTION public.cashier_sync_offline_orders");
  const end = sql.indexOf("REVOKE ALL ON FUNCTION public.cashier_sync_offline_orders", start);
  await db.exec(sql.slice(start, end));
}, 30000);
afterAll(async () => { await db.close(); });

describe("server offline daily cup limit", () => {
  it("counts pending orders towards the two-cup plan and rejects the third", async () => {
    await db.exec(`INSERT INTO orders(subscription_id,order_date,status) VALUES('${sub}',(now() AT TIME ZONE 'Asia/Riyadh')::date,'pending')`);
    expect((await sync("00000000-0000-0000-0000-000000000010")).synced).toBe(1);
    expect((await sync("00000000-0000-0000-0000-000000000011")).results[0].reason).toBe("daily_limit_reached");
    const count = await db.query<{ n: number }>("select count(*)::integer n from orders");
    expect(count.rows[0].n).toBe(2);
  });
  it("does not consume another cup when retrying a synced order at the limit", async () => {
    const result = await sync("00000000-0000-0000-0000-000000000010");
    expect(result.duplicates).toBe(1);
    expect(result.synced).toBe(0);
  });
  it("rejects a cashier who cannot serve the company", async () => {
    await db.exec("CREATE OR REPLACE FUNCTION public.can_manage_org(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$");
    expect((await sync("00000000-0000-0000-0000-000000000012")).results[0].reason).toBe("branch_forbidden");
  });
});