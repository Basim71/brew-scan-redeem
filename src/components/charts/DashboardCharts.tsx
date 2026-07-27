import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * Lazy-loadable chart bundle for the company dashboard. Splitting this off
 * the route lets Recharts (~90 KB gzipped) load in parallel with the
 * initial KPI grid instead of blocking first paint.
 */

export type SeriesPoint = { label: string; [key: string]: string | number };

const TOOLTIP_STYLE = {
  background: "#fff8ee",
  border: "1px solid #e6d7ba",
  borderRadius: 10,
  color: "#3a2617",
} as const;

export function RevenueAreaChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c8963c" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#c8963c" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(60,40,25,0.08)" vertical={false} />
        <XAxis dataKey="label" stroke="#6b503a" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#6b503a" fontSize={11} tickLine={false} axisLine={false} width={40} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Area type="monotone" dataKey="revenue" stroke="#8a5a24" strokeWidth={2} fill="url(#revGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SubscriptionAreaChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a2617" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#3a2617" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(60,40,25,0.08)" vertical={false} />
        <XAxis dataKey="label" stroke="#6b503a" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#6b503a" fontSize={11} tickLine={false} axisLine={false} width={30} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Area type="monotone" dataKey="subscriptions" stroke="#3a2617" strokeWidth={2} fill="url(#subGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}