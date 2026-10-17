import { useCallback, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldAlert,
  Thermometer,
  Activity,
  Zap,
  Gauge,
} from "lucide-react"

const API_BASE_URL = "http://127.0.0.1:8001"

interface Incident {
  id: number
  machine_id: number
  severity: string
  title: string
  description: string
  temperature: number | null
  vibration: number | null
  power_consumption: number | null
  rpm: number | null
  health_score: number
  status: string
  created_at: string
  resolved_at: string | null
}

type SeverityFilter = "all" | "critical" | "warning"

async function getActiveIncidents(): Promise<Incident[]> {
  const response = await fetch(
    `${API_BASE_URL}/incidents/active`,
  )

  if (!response.ok) {
    throw new Error(
      `Incidents API failed: ${response.status}`,
    )
  }

  return response.json()
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return timestamp
  }

  return date.toLocaleString()
}

function getSeverityStyles(severity: string) {
  switch (severity.toLowerCase()) {
    case "critical":
      return {
        badge:
          "border-red-500/30 bg-red-500/10 text-red-400",
        border: "border-red-500/20",
      }

    case "warning":
      return {
        badge:
          "border-amber-500/30 bg-amber-500/10 text-amber-400",
        border: "border-amber-500/20",
      }

    default:
      return {
        badge:
          "border-slate-500/30 bg-slate-500/10 text-slate-400",
        border: "border-slate-500/20",
      }
  }
}

function SeverityIcon({
  severity,
  size = 18,
}: {
  severity: string
  size?: number
}) {
  if (severity.toLowerCase() === "critical") {
    return <ShieldAlert size={size} />
  }

  if (severity.toLowerCase() === "warning") {
    return <AlertTriangle size={size} />
  }

  return <AlertCircle size={size} />
}

function MetricCard({
  icon,
  label,
  value,
  unit,
}: {
  icon: ReactNode
  label: string
  value: string | number
  unit?: string
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500">
        {icon}
        <span>{label}</span>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-lg font-semibold text-slate-100">
          {value}
        </span>

        {unit && (
          <span className="text-xs text-slate-500">
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}

function IncidentCard({
  incident,
}: {
  incident: Incident
}) {
  const severity = getSeverityStyles(incident.severity)

  const healthColor =
    incident.health_score < 50
      ? "text-red-400"
      : incident.health_score < 80
        ? "text-amber-400"
        : "text-emerald-400"

  const healthBarColor =
    incident.health_score < 50
      ? "rgb(248 113 113)"
      : incident.health_score < 80
        ? "rgb(251 191 36)"
        : "rgb(52 211 153)"

  return (
    <article
      className={`rounded-2xl border bg-slate-950/60 p-5 transition hover:bg-white/[0.035] ${severity.border}`}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex gap-3">
          <div
            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${severity.badge}`}
          >
            <SeverityIcon
              severity={incident.severity}
              size={19}
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-100">
                {incident.title}
              </h3>

              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${severity.badge}`}
              >
                {incident.severity}
              </span>

              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-400">
                {incident.status}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>
                Machine ID: #{incident.machine_id}
              </span>

              <span className="flex items-center gap-1">
                <Clock3 size={13} />
                {formatTimestamp(incident.created_at)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
          Active incident
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-white/5 bg-black/20 p-4">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Incident Description
        </div>

        <p className="text-sm leading-6 text-slate-300">
          {incident.description}
        </p>
      </div>

      <div className="mt-4">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Telemetry Evidence
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            icon={<Thermometer size={14} />}
            label="Temperature"
            value={
              incident.temperature !== null
                ? incident.temperature.toFixed(2)
                : "—"
            }
            unit="°C"
          />

          <MetricCard
            icon={<Activity size={14} />}
            label="Vibration"
            value={
              incident.vibration !== null
                ? incident.vibration.toFixed(2)
                : "—"
            }
            unit="mm/s"
          />

          <MetricCard
            icon={<Zap size={14} />}
            label="Power"
            value={
              incident.power_consumption !== null
                ? incident.power_consumption.toFixed(2)
                : "—"
            }
            unit="kW"
          />

          <MetricCard
            icon={<Gauge size={14} />}
            label="RPM"
            value={
              incident.rpm !== null
                ? incident.rpm.toFixed(0)
                : "—"
            }
            unit="RPM"
          />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/5 bg-black/20 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Machine Health
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Health score recorded when incident was created
            </div>
          </div>

          <span
            className={`text-xl font-bold ${healthColor}`}
          >
            {incident.health_score.toFixed(0)}%
          </span>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.max(
                0,
                Math.min(100, incident.health_score),
              )}%`,
              background: healthBarColor,
            }}
          />
        </div>
      </div>
    </article>
  )
}

export default function IncidentCenter() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] =
    useState<SeverityFilter>("all")

  const loadIncidents = useCallback(async () => {
    try {
      setError(null)

      const data = await getActiveIncidents()

      setIncidents(data)
    } catch (err) {
      console.error(
        "Failed to load incidents:",
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load active incidents.",
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadIncidents()

    const interval = window.setInterval(() => {
      loadIncidents()
    }, 5000)

    return () => {
      window.clearInterval(interval)
    }
  }, [loadIncidents])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadIncidents()
  }

  const filteredIncidents = useMemo(() => {
    if (filter === "all") {
      return incidents
    }

    return incidents.filter(
      (incident) =>
        incident.severity.toLowerCase() === filter,
    )
  }, [incidents, filter])

  const criticalCount = incidents.filter(
    (incident) =>
      incident.severity.toLowerCase() === "critical",
  ).length

  const warningCount = incidents.filter(
    (incident) =>
      incident.severity.toLowerCase() === "warning",
  ).length

  const averageHealth = incidents.length
    ? Math.round(
        incidents.reduce(
          (sum, incident) =>
            sum + incident.health_score,
          0,
        ) / incidents.length,
      )
    : 100

  return (
    <section className="min-h-full bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-[1600px]">

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400">
                <ShieldAlert size={19} />
              </div>

              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
                Operations Control
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight">
              Incident Center
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Monitor active machine incidents, telemetry
              evidence, and operational health conditions.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "animate-spin"
                  : undefined
              }
            />

            Refresh
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-slate-500">
                Active Incidents
              </span>

              <AlertCircle
                size={17}
                className="text-blue-400"
              />
            </div>

            <div className="mt-3 text-3xl font-bold">
              {incidents.length}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Currently open
            </div>
          </div>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-slate-500">
                Critical
              </span>

              <ShieldAlert
                size={17}
                className="text-red-400"
              />
            </div>

            <div className="mt-3 text-3xl font-bold text-red-400">
              {criticalCount}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Immediate attention
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-slate-500">
                Warning
              </span>

              <AlertTriangle
                size={17}
                className="text-amber-400"
              />
            </div>

            <div className="mt-3 text-3xl font-bold text-amber-400">
              {warningCount}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Requires investigation
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-slate-500">
                Avg. Health
              </span>

              <CheckCircle2
                size={17}
                className="text-emerald-400"
              />
            </div>

            <div className="mt-3 text-3xl font-bold">
              {averageHealth}%
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Across active incidents
            </div>
          </div>

        </div>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1">

            {(
              [
                ["all", "All"],
                ["critical", "Critical"],
                ["warning", "Warning"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                  filter === value
                    ? "bg-white/10 text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {label}
              </button>
            ))}

          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Live monitoring · 5s refresh
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-4">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0 text-red-400"
            />

            <div>
              <div className="text-sm font-semibold text-red-300">
                Unable to load incidents
              </div>

              <div className="mt-1 text-xs leading-5 text-red-400/80">
                {error}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid gap-4">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="h-80 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
              />
            ))}
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 size={30} />
            </div>

            <h2 className="mt-5 text-lg font-semibold text-slate-200">
              No active incidents
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              All monitored machines are currently clear
              for the selected incident filter.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredIncidents.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
              />
            ))}
          </div>
        )}

      </div>
    </section>
  )
}