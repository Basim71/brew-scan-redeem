import { useCallback, useEffect, useState } from "react";
import { CloudOff, RefreshCw, ScanLine, Wifi } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Field, Select } from "@/components/kob";
import {
  type CustomerToken,
  type QueuedOrder,
  checkToken,
  loadJson,
  parseToken,
  saveJson,
  todayRiyadh,
} from "./offline-queue";

const QUEUE_KEY = "kob.offline.queue";
const DRINKS_KEY = "kob.offline.drinks";
const USAGE_KEY = "kob.offline.usage"; // { [day:sid]: count }
const NONCE_KEY = "kob.offline.nonces";

type Drink = { id: string; name_ar: string; name_en: string };
type Rejected = { id: string; reason: string };

export function OfflinePanel({ branchId }: { branchId: string }) {
  const { t, lang, fmtNum } = useI18n();
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<QueuedOrder[]>([]);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [raw, setRaw] = useState("");
  const [token, setToken] = useState<CustomerToken | null>(null);
  const [drinkId, setDrinkId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [rejected, setRejected] = useState<Rejected[]>([]);

  useEffect(() => {
    setOnline(navigator.onLine);
    setQueue(loadJson<QueuedOrder[]>(QUEUE_KEY, []));
    setDrinks(loadJson<Drink[]>(DRINKS_KEY, []));
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Cache drinks while online so they are available offline.
  useEffect(() => {
    if (!online) return;
    supabase
      .from("drink_types")
      .select("id, name_ar, name_en")
      .eq("is_active", true)
      .order("name_en")
      .then(({ data }) => {
        if (data) {
          setDrinks(data);
          saveJson(DRINKS_KEY, data);
        }
      });
  }, [online]);

  const sync = useCallback(async (items: QueuedOrder[]) => {
    if (!items.length || !navigator.onLine) return;
    setSyncing(true);
    const { data, error: err } = await supabase.rpc("cashier_sync_offline_orders" as never, {
      _orders: items,
    } as never);
    setSyncing(false);
    if (err) return; // keep queue, retry later
    const res = data as unknown as {
      synced: number;
      results: { offline_sync_id: string; result: string; reason?: string }[];
    };
    const done = new Set(res.results.map((r) => r.offline_sync_id));
    const rej = res.results
      .filter((r) => r.result === "rejected")
      .map((r) => ({ id: r.offline_sync_id, reason: r.reason ?? "" }));
    const rest = loadJson<QueuedOrder[]>(QUEUE_KEY, []).filter((q) => !done.has(q.offline_sync_id));
    saveJson(QUEUE_KEY, rest);
    setQueue(rest);
    if (rej.length) setRejected((p) => [...rej, ...p]);
    if (res.synced) setNotice(t("cashier.offline.syncResult", { n: res.synced }));
  }, [t]);

  // Auto-sync on reconnect and every 30s.
  useEffect(() => {
    if (online) void sync(loadJson<QueuedOrder[]>(QUEUE_KEY, []));
    const id = window.setInterval(() => {
      void sync(loadJson<QueuedOrder[]>(QUEUE_KEY, []));
    }, 30000);
    return () => window.clearInterval(id);
  }, [online, sync]);

  function readCode() {
    setError(null);
    setNotice(null);
    const tok = parseToken(raw);
    if (!tok) return setError(t("cashier.offline.invalid"));
    const usage = loadJson<Record<string, number>>(USAGE_KEY, {});
    const nonces = loadJson<string[]>(NONCE_KEY, []);
    const problem = checkToken(tok, {
      now: Date.now(),
      today: todayRiyadh(),
      localUsed: usage[`${tok.day}:${tok.sid}`] ?? 0,
      usedNonces: nonces,
    });
    if (problem) return setError(t(`cashier.offline.${problem}` as never));
    setToken(tok);
    setDrinkId(drinks[0]?.id ?? "");
  }

  async function serve() {
    if (!token || !drinkId) return;
    const order: QueuedOrder = {
      offline_sync_id: crypto.randomUUID(),
      subscription_id: token.sid,
      branch_id: branchId,
      drink_type_id: drinkId,
      served_at: new Date().toISOString(),
      method: "offline_qr",
      selected_options: [],
      customer_note: null,
    };
    const usage = loadJson<Record<string, number>>(USAGE_KEY, {});
    const k = `${token.day}:${token.sid}`;
    usage[k] = (usage[k] ?? 0) + 1;
    saveJson(USAGE_KEY, usage);
    saveJson(NONCE_KEY, [token.nonce, ...loadJson<string[]>(NONCE_KEY, [])].slice(0, 500));
    const next = [...loadJson<QueuedOrder[]>(QUEUE_KEY, []), order];
    saveJson(QUEUE_KEY, next);
    setQueue(next);
    setToken(null);
    setRaw("");
    setNotice(navigator.onLine ? t("cashier.offline.servedOnline") : t("cashier.offline.servedQueued"));
    if (navigator.onLine) await sync(next);
  }

  const localUsed = token
    ? loadJson<Record<string, number>>(USAGE_KEY, {})[`${token.day}:${token.sid}`] ?? 0
    : 0;

  return (
    <Card>
      <CardHeader
        title={t("cashier.offline.title")}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={online ? "success" : "warning"}>
              {online ? <Wifi className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}{" "}
              {online ? t("cashier.offline.online") : t("cashier.offline.offline")}
            </Badge>
            {queue.length > 0 && (
              <Button size="sm" variant="secondary" onClick={() => sync(queue)} disabled={!online || syncing}>
                <RefreshCw className="h-4 w-4" />
                {syncing ? t("cashier.offline.syncing") : `${t("cashier.offline.syncNow")} (${fmtNum(queue.length)})`}
              </Button>
            )}
          </div>
        }
      />
      <CardBody>
        <div className="grid gap-3">
          {error && <Alert tone="danger">{error}</Alert>}
          {notice && <Alert tone="success">{notice}</Alert>}
          {queue.length > 0 && (
            <Alert tone="warning">
              {t("cashier.offline.queued")}: {fmtNum(queue.length)}
            </Alert>
          )}

          {!token ? (
            <Field label={t("cashier.offline.scanLabel")} hint={t("cashier.offline.scanHint")}>
              <div className="flex gap-2">
                <input
                  className="kob-input flex-1"
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && readCode()}
                  dir="ltr"
                />
                <Button onClick={readCode} disabled={!raw.trim()}>
                  <ScanLine className="h-4 w-4" />
                  {t("cashier.offline.read")}
                </Button>
              </div>
            </Field>
          ) : (
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>{token.name}</strong>
                <span>{token.plan}</span>
                <Badge tone="gold">
                  {t("cashier.offline.cups")}: {fmtNum(Math.max(token.used_today, localUsed))} / {fmtNum(token.max)}
                </Badge>
              </div>
              {drinks.length === 0 ? (
                <Alert tone="warning">{t("cashier.offline.noDrinks")}</Alert>
              ) : (
                <Field label={t("cashier.offline.drink")}>
                  <Select value={drinkId} onChange={(e) => setDrinkId(e.target.value)}>
                    {drinks.map((d) => (
                      <option key={d.id} value={d.id}>
                        {lang === "ar" ? d.name_ar : d.name_en}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              <div className="flex gap-2">
                <Button onClick={serve} disabled={!drinkId}>{t("cashier.offline.serve")}</Button>
                <Button variant="ghost" onClick={() => setToken(null)}>{t("cashier.offline.cancel")}</Button>
              </div>
            </div>
          )}

          {rejected.length > 0 && (
            <Alert tone="danger">
              <div className="flex items-center justify-between gap-2">
                <strong>{t("cashier.offline.rejected")}</strong>
                <Button size="sm" variant="ghost" onClick={() => setRejected([])}>{t("cashier.offline.dismiss")}</Button>
              </div>
              <ul>
                {rejected.map((r) => (
                  <li key={r.id} dir="ltr">{r.id.slice(0, 8)} — {r.reason}</li>
                ))}
              </ul>
            </Alert>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
