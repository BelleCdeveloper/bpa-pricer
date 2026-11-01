import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";

type Member = { age: number; pension: number };
type Result = {
  price: number;
  multiple_of_pension: number;
  cashflows: number[];
  sensitivities: Record<string, number>;
};

const gbp = (n: number) =>
  n.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

export default function App() {
  const [members, setMembers] = useState<Member[]>([
    { age: 65, pension: 10000 },
    { age: 70, pension: 8000 },
  ]);
  const [discount, setDiscount] = useState(4.5);
  const [inflation, setInflation] = useState(3);
  const [mortShift, setMortShift] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateMember = (i: number, field: keyof Member, value: number) =>
    setMembers(members.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)));

  const runPrice = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          members,
          discount: discount / 100,
          inflation: inflation / 100,
          mort_shift: mortShift / 100,
        }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status}). Check the inputs.`);
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const chartData = result
    ? result.cashflows
        .map((c, t) => ({ year: t, cashflow: Math.round(c) }))
        .filter((d) => d.cashflow > 0)
    : [];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24, textAlign: "left" }}>
      <h1>BPA Pricer</h1>
      <p>Illustrative prototype using synthetic members and a made-up mortality basis. Not a real quote.</p>

      <h3>Members</h3>
      {members.map((m, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <label>Age <input type="number" value={m.age}
            onChange={(e) => updateMember(i, "age", Number(e.target.value))} /></label>
          <label>Pension (£ pa) <input type="number" value={m.pension}
            onChange={(e) => updateMember(i, "pension", Number(e.target.value))} /></label>
          <button onClick={() => setMembers(members.filter((_, idx) => idx !== i))}>Remove</button>
        </div>
      ))}
      <button onClick={() => setMembers([...members, { age: 65, pension: 5000 }])}>Add member</button>

      <h3>Assumptions</h3>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <label>Discount rate % <input type="number" step="0.1" value={discount}
          onChange={(e) => setDiscount(Number(e.target.value))} /></label>
        <label>Inflation % <input type="number" step="0.1" value={inflation}
          onChange={(e) => setInflation(Number(e.target.value))} /></label>
        <label>Mortality shift % <input type="number" step="5" value={mortShift}
          onChange={(e) => setMortShift(Number(e.target.value))} /></label>
      </div>

      <p><button onClick={runPrice} disabled={loading || members.length === 0}>
        {loading ? "Pricing..." : "Price"}
      </button></p>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {result && (
        <>
          <h3>Result</h3>
          <p>Price: <strong>{gbp(result.price)}</strong> ({result.multiple_of_pension.toFixed(1)}x annual pension)</p>

          <h3>Sensitivities</h3>
          <table>
            <tbody>
              {Object.entries(result.sensitivities).map(([name, value]) => (
                <tr key={name}>
                  <td style={{ paddingRight: 16 }}>{name}</td>
                  <td>{gbp(value)} ({value >= result.price ? "+" : ""}{gbp(value - result.price)})</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Expected cashflows</h3>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" label={{ value: "Years from now", position: "insideBottom", offset: -5 }} />
                <YAxis tickFormatter={(v) => `£${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v) => gbp(Number(v))} />
                <Line type="monotone" dataKey="cashflow" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}