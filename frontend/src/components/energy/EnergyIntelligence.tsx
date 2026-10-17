
import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock3,
  Gauge,
  Zap,
} from "lucide-react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { Machine } from "../../services/api"

type EnergyAnalytics = {
  machine: {
    id: number
    machine_code: string
    name: string
    location: string
  }
  period: {
    hours: number
    from: string
    to: string
    telemetry_records: number
  }
  energy: {
    current_power_kw: number
    average_power_kw: number
    peak_power_kw: number
    minimum_power_kw: number
    estimated_energy_kwh: number
    energy_status: "normal" | "elevated" | "high"
  }
  high_consumption: {
    threshold_kw: number
    readings: number
    percentage: number
  }
  latest_reading: {
    power_consumption: number
    recorded_at: string
  }
}

type EnergyIntelligenceProps = {
  machine: Machine | null
}

export default function EnergyIntelligence({
  machine,
}: EnergyIntelligenceProps) {
  const [data, setData] = useState<EnergyAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  async function loadEnergyAnalytics() {
    if (!machine) {
      setData(null)
      setLoading(false)
      return
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8001/analytics/energy/${machine.id}?hours=1`,
      )

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(
          body?.detail ?? "Unable to load energy analytics.",
        )
      }

      const result = (await response.json()) as EnergyAnalytics
      setData(result)
      setError(null)
    } catch (err) {
      console.error("Energy analytics loading failed:", err)
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load energy analytics.",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function refresh() {
      if (!cancelled) {
        await loadEnergyAnalytics()
      }
    }

    setLoading(true)
    void refresh()

    const interval = window.setInterval(() => {
      void refresh()
    }, 5000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [machine?.id])

  // Update freshness even if the API request fails.
  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(interval)
  }, [])

  const lastReadingTimestamp = data
    ? new Date(data.latest_reading.recorded_at).getTime()
    : Number.NaN

  const readingAgeMs = now - lastReadingTimestamp

  // The simulator normally reports every 5 seconds.
  // A reading is considered fresh only for 15 seconds.
  const isTelemetryFresh =
    Boolean(data) &&
    machine?.status !== "offline" &&
    Number.isFinite(lastReadingTimestamp) &&
    readingAgeMs >= -5000 &&
    readingAgeMs <= 15000

  const isMachineOffline = machine?.status === "offline"
  const isReadingStale = !isTelemetryFresh
  const status = data?.energy.energy_status ?? "normal"

  const statusConfig = useMemo(() => {
    if (isMachineOffline) {
      return {
        label: "Machine Offline",
        className:
          "bg-slate-500/10 text-slate-300 border-slate-500/20",
      }
    }

    if (isReadingStale) {
      return {
        label: "Telemetry Stale",
        className:
          "bg-amber-500/10 text-amber-400 border-amber-500/20",
      }
    }

    if (status === "high") {
      return {
        label: "High Consumption",
        className:
          "bg-red-500/10 text-red-400 border-red-500/20",
      }
    }

    if (status === "elevated") {
      return {
        label: "Elevated",
        className:
          "bg-amber-500/10 text-amber-400 border-amber-500/20",
      }
    }

    return {
      label: "Normal",
      className:
        "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    }
  }, [isMachineOffline, isReadingStale, status])

  if (!machine) {
    return (
      <section className="rounded-xl border border-white/10 bg-[#0d1422] p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium">Energy Intelligence</h3>
            <p className="mt-1 text-xs text-gray-500">
              Select a machine to view energy analytics.
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (loading && !data) {
    return (
      <section className="rounded-xl border border-white/10 bg-[#0d1422] p-6">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 animate-pulse text-cyan-400" />
          <div>
            <h3 className="font-medium">Energy Intelligence</h3>
            <p className="mt-1 text-xs text-gray-500">
              Loading energy analytics...
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (error && !data) {
    return (
      <section className="rounded-xl border border-amber-500/20 bg-[#0d1422] p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-400" />
          <div>
            <h3 className="font-medium">Energy Intelligence</h3>
            <p className="mt-1 text-xs text-gray-500">{error}</p>
            <p className="mt-2 text-[10px] text-gray-600">
              Energy analytics will appear when the API is available.
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (!data) return null

  const chartData = [
    { name: "Minimum", power: data.energy.minimum_power_kw },
    { name: "Average", power: data.energy.average_power_kw },
    {
      name: isTelemetryFresh ? "Latest" : "Last Known",
      power: data.latest_reading.power_consumption,
    },
    { name: "Peak", power: data.energy.peak_power_kw },
  ]

  return (
    <section className="mt-6">
      {/* HEADER */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-cyan-400">ENERGY INTELLIGENCE</p>
          <h3 className="mt-1 text-lg font-medium">
            Energy Consumption Analytics
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Electrical load analysis for{" "}
            <span className="text-gray-400">{machine.machine_code}</span>
            {" · "}
            {machine.name}
          </p>
        </div>

        <div
          className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-medium ${statusConfig.className}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {statusConfig.label}
        </div>
      </div>

      {isReadingStale && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <p className="text-xs font-medium text-amber-300">
              {isMachineOffline ? "Machine is offline" : "Telemetry is stale"}
            </p>
            <p className="mt-1 text-[11px] leading-4 text-gray-400">
              Values below are historical readings, not confirmed current
              power.
              {Number.isFinite(lastReadingTimestamp) && (
                <>
                  {" "}Last reading:{" "}
                  {new Date(lastReadingTimestamp).toLocaleString()}.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <EnergyMetric
          title={isTelemetryFresh ? "Current Power" : "Last Known Power"}
          value={data.latest_reading.power_consumption}
          unit="kW"
          icon={<Zap className="h-4 w-4" />}
        />
        <EnergyMetric
          title="Average Power"
          value={data.energy.average_power_kw}
          unit="kW"
          icon={<Activity className="h-4 w-4" />}
        />
        <EnergyMetric
          title="Peak Power"
          value={data.energy.peak_power_kw}
          unit="kW"
          icon={<Gauge className="h-4 w-4" />}
        />
        <EnergyMetric
          title="Estimated Energy"
          value={data.energy.estimated_energy_kwh}
          unit="kWh"
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <EnergyMetric
          title="High Load"
          value={data.high_consumption.percentage}
          unit="%"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      {/* ANALYTICS */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#0d1422] p-5 xl:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-sm font-medium">Power Profile</h4>
              <p className="mt-1 text-xs text-gray-600">
                Minimum, average, latest recorded and peak load
              </p>
            </div>
            <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
              <BarChart3 className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-5 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#6b7280", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  width={45}
                />
                <Tooltip
                  formatter={(value) => [
                    `${Number(value ?? 0).toFixed(2)} kW`,
                    "Power",
                  ]}
                  contentStyle={{
                    backgroundColor: "#0d1422",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#e5e7eb",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="power"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#22d3ee" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
            <span className="text-[10px] text-gray-600">
              {data.period.telemetry_records} telemetry readings
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-gray-600">
              <Clock3 className="h-3 w-3" />
              Last {data.period.hours} hour
            </span>
          </div>
        </div>

        {/* CONSUMPTION ANALYSIS */}
        <div className="rounded-xl border border-white/10 bg-[#0d1422] p-5">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-sm font-medium">Consumption Analysis</h4>
              <p className="mt-1 text-xs text-gray-600">
                Electrical load threshold monitoring
              </p>
            </div>
            <Zap className="h-4 w-4 text-gray-500" />
          </div>

          <div className="mt-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-gray-500">High-load readings</p>
                <p className="mt-2 text-3xl font-semibold">
                  {data.high_consumption.readings}
                </p>
              </div>
              <span className="text-sm text-gray-500">
                {data.high_consumption.percentage}%
              </span>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                style={{
                  width: `${Math.min(data.high_consumption.percentage, 100)}%`,
                }}
              />
            </div>

            <div className="mt-5 rounded-lg border border-white/5 bg-[#0a101c] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">High-load threshold</span>
                <span className="text-sm font-medium text-gray-300">
                  {data.high_consumption.threshold_kw} kW
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-gray-500">Minimum observed</span>
                <span className="text-sm text-gray-300">
                  {data.energy.minimum_power_kw} kW
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-gray-500">Peak observed</span>
                <span className="text-sm text-gray-300">
                  {data.energy.peak_power_kw} kW
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LATEST READING */}
      <div className="mt-4 rounded-xl border border-white/10 bg-[#0d1422] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-600">
              {isTelemetryFresh
                ? "Latest Energy Reading"
                : "Last Known Energy Reading"}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-semibold">
                {data.latest_reading.power_consumption.toFixed(2)}
              </span>
              <span className="text-sm text-gray-600">kW</span>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-xs text-gray-600">Last updated</p>
            <p className="mt-1 text-xs text-gray-400">
              {new Date(data.latest_reading.recorded_at).toLocaleString()}
            </p>
            <p
              className={`mt-2 text-[10px] ${
                isTelemetryFresh ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {isMachineOffline
                ? "Offline · historical reading"
                : isTelemetryFresh
                  ? "Live · refreshed every 5s"
                  : "Stale · waiting for fresh telemetry"}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-[10px] text-amber-400">
          Latest refresh failed: {error}
        </p>
      )}
    </section>
  )
}

function EnergyMetric({
  title,
  value,
  unit,
  icon,
}: {
  title: string
  value: number
  unit: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0d1422] p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{title}</span>
        <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold">{value.toFixed(2)}</span>
        <span className="text-xs text-gray-600">{unit}</span>
      </div>
    </div>
  )
}
