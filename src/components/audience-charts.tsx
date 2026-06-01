"use client";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Qulture data-viz palette: Violet · Cyan · Heat · Gold · Green
const COLORS = ["#9B5CFF", "#22D4EE", "#FF46CC", "#FFBA45", "#4EE89E", "#7040CC", "#FF8AD8"];

type Dist = Record<string, number>;
const toData = (d: Dist) =>
  Object.entries(d)
    .map(([name, value]) => ({ name, value: Math.round(value * 1000) / 10 }))
    .sort((a, b) => b.value - a.value);

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="h-56">{children}</CardContent>
    </Card>
  );
}

export function AudienceCharts({
  gender,
  age,
  geo,
  interests,
  history,
}: {
  gender: Dist;
  age: Dist;
  geo: Dist;
  interests: Dist;
  history: { date: string; followers: number }[];
}) {
  const genderData = toData(gender);
  const ageData = toData(age);
  const geoData = toData(geo).slice(0, 6);
  const interestData = toData(interests).slice(0, 6);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ChartCard title="Gender split (%)">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={(e) => `${e.name} ${e.value}%`}>
              {genderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Age distribution (%)">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={ageData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Bar dataKey="value" fill="#9B5CFF" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Top geographies (%)">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={geoData} layout="vertical">
            <XAxis type="number" fontSize={11} />
            <YAxis type="category" dataKey="name" width={90} fontSize={11} />
            <Tooltip />
            <Bar dataKey="value" fill="#22D4EE" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Audience interests (%)">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={interestData} layout="vertical">
            <XAxis type="number" fontSize={11} />
            <YAxis type="category" dataKey="name" width={90} fontSize={11} />
            <Tooltip />
            <Bar dataKey="value" fill="#FFBA45" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {history.length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Follower growth (6 mo)</CardTitle></CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => Intl.NumberFormat("en", { notation: "compact" }).format(v)} />
                <Tooltip formatter={(v: number) => Intl.NumberFormat("en").format(v)} />
                <Line type="monotone" dataKey="followers" stroke="#9B5CFF" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
