import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardHeader, CardBody } from "@/components/kob";
import type { SeriesPoint } from "./derive";

const PIE_COLORS = ["#c98745", "#8a5a24", "#d9ab6a", "#6f4e39", "#e0c48f", "#a97142"];
const AXIS = { fill: "#806f65", fontSize: 11 };
const GRID = "rgba(111,78,57,.12)";
const TOOLTIP = {
  borderRadius: 14,
  border: "1px solid rgba(111,78,57,.14)",
  background: "#fffdf9",
  fontSize: 12,
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="an-chart-card">
      <CardHeader title={title} />
      <CardBody className="an-chart-body">
        <ResponsiveContainer width="100%" height="100%">
          {children as any}
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}

export function ChartsSection({
  isAr,
  revenue,
  orders,
  distribution,
  drinks,
  branches,
  money,
}: {
  isAr: boolean;
  revenue: SeriesPoint[];
  orders: SeriesPoint[];
  distribution: SeriesPoint[];
  drinks: SeriesPoint[];
  branches: SeriesPoint[];
  money: (value: number) => string;
}) {
  return (
    <div className="an-charts">
      <ChartCard title={isAr ? "اتجاه الإيرادات" : "Revenue Trend"}>
        <LineChart data={revenue} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 8" vertical={false} stroke={GRID} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS} />
          <YAxis axisLine={false} tickLine={false} tick={AXIS} />
          <Tooltip formatter={(value) => money(Number(value))} contentStyle={TOOLTIP} />
          <Line type="monotone" dataKey="value" stroke="#c98745" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ChartCard>

      <ChartCard title={isAr ? "اتجاه الطلبات" : "Orders Trend"}>
        <LineChart data={orders} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 8" vertical={false} stroke={GRID} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS} />
          <YAxis axisLine={false} tickLine={false} tick={AXIS} allowDecimals={false} />
          <Tooltip contentStyle={TOOLTIP} />
          <Line type="monotone" dataKey="value" stroke="#6f4e39" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ChartCard>

      <ChartCard title={isAr ? "توزيع الاشتراكات" : "Subscription Distribution"}>
        <PieChart>
          <Pie data={distribution} dataKey="value" nameKey="label" innerRadius="45%" outerRadius="72%" paddingAngle={2}>
            {distribution.map((_, index) => (
              <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: 11 }} />
          <Tooltip contentStyle={TOOLTIP} />
        </PieChart>
      </ChartCard>

      <ChartCard title={isAr ? "المشروبات الأكثر طلبًا" : "Drink Popularity"}>
        <BarChart data={drinks} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 8" vertical={false} stroke={GRID} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS} />
          <YAxis axisLine={false} tickLine={false} tick={AXIS} allowDecimals={false} />
          <Tooltip contentStyle={TOOLTIP} />
          <Bar dataKey="value" fill="#c98745" radius={[10, 10, 0, 0]} />
        </BarChart>
      </ChartCard>

      <ChartCard title={isAr ? "مقارنة الفروع" : "Branch Comparison"}>
        <BarChart data={branches} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 8" vertical={false} stroke={GRID} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS} />
          <YAxis axisLine={false} tickLine={false} tick={AXIS} />
          <Tooltip formatter={(value) => money(Number(value))} contentStyle={TOOLTIP} />
          <Bar dataKey="value" fill="#8a5a24" radius={[10, 10, 0, 0]} />
        </BarChart>
      </ChartCard>
    </div>
  );
}
