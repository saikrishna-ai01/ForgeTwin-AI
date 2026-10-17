import { lazy, Suspense, useEffect, useState, type ReactNode } from "react"

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  Factory,
  Gauge,
  LayoutDashboard,
  RefreshCw,
  Settings,
  ShieldCheck,
  Wifi,
  WifiOff,
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

import {
  getActiveIncidents,
  getDashboard,
  getLiveOperations,
  getMachineTelemetry,
  type DashboardData,
  type LiveOperationsData,
  type Incident,
  type Machine,
  type TelemetryReading,
} from "./services/api"

const DigitalTwin = lazy(() => import("./components/digital-twin/DigitalTwin"))
const IncidentCenter = lazy(() => import("./components/incidents/IncidentCenter"))
const OperationsCopilot = lazy(() => import("./components/copilot/OperationsCopilot"))
const EnergyIntelligence = lazy(() => import("./components/energy/EnergyIntelligence"))


type ActiveView =
  | "dashboard"
  | "incidents"
  | "copilot"
  | "energy"


function App() {
  const [activeView, setActiveView] =
    useState<ActiveView>("dashboard")

  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null)

  const [liveOperations, setLiveOperations] =
    useState<LiveOperationsData | null>(null)

  const [incidents, setIncidents] =
    useState<Incident[]>([])

  const [telemetry, setTelemetry] =
    useState<TelemetryReading[]>([])

  const [selectedMachineId, setSelectedMachineId] =
    useState<number | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(null)


  async function loadDashboard() {
    try {
      const [dashboardData, incidentData] =
        await Promise.all([
          getDashboard(),
          getActiveIncidents(),
        ])

      setDashboard(dashboardData)
      setIncidents(incidentData)

      setSelectedMachineId((currentSelectedId) => {
        if (currentSelectedId !== null) {
          const stillExists =
            dashboardData.machines.some(
              (machine) =>
                machine.id === currentSelectedId,
            )

          if (stillExists) {
            return currentSelectedId
          }
        }

        const firstOnlineMachine =
          dashboardData.machines.find(
            (machine) =>
              machine.status !== "offline",
          )

        return (
          firstOnlineMachine?.id ??
          dashboardData.machines[0]?.id ??
          null
        )
      })

      setError(null)
    } catch (err) {
      console.error(
        "Dashboard loading failed:",
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load dashboard data.",
      )
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    loadDashboard()

    const interval = window.setInterval(() => {
      loadDashboard()
    }, 5000)

    return () => {
      window.clearInterval(interval)
    }
  }, [])


  useEffect(() => {
    let cancelled = false

    async function loadLiveOperations() {
      try {
        const liveData = await getLiveOperations()

        if (!cancelled) {
          setLiveOperations(liveData)
        }
      } catch (err) {
        console.error(
          "Live operations loading failed:",
          err,
        )
      }
    }

    loadLiveOperations()

    const interval = window.setInterval(() => {
      loadLiveOperations()
    }, 5000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])


  useEffect(() => {
    if (selectedMachineId === null) {
      setTelemetry([])
      return
    }

    const machineId = selectedMachineId

    async function loadSelectedMachineTelemetry() {
      try {
        const telemetryData =
          await getMachineTelemetry(machineId)

        const recentTelemetry =
          telemetryData
            .slice(0, 30)
            .reverse()

        setTelemetry(recentTelemetry)
      } catch (err) {
        console.error(
          "Telemetry loading failed:",
          err,
        )

        setTelemetry([])
      }
    }

    loadSelectedMachineTelemetry()

    const interval = window.setInterval(() => {
      loadSelectedMachineTelemetry()
    }, 5000)

    return () => {
      window.clearInterval(interval)
    }
  }, [selectedMachineId])


  if (loading) {
    return <LoadingScreen />
  }


  if (error || !dashboard) {
    return (
      <ErrorScreen
        message={
          error ??
          "Dashboard data unavailable."
        }
        onRetry={loadDashboard}
      />
    )
  }


  const selectedMachine =
    dashboard.machines.find(
      (machine) =>
        machine.id === selectedMachineId,
    ) ?? null

  const systemStatus = !liveOperations
    ? "Connecting"
    : incidents.some(
          (incident) =>
            incident.status === "open" &&
            incident.severity === "critical",
        ) || liveOperations.plant.critical > 0
      ? "Attention Required"
      : liveOperations.plant.machines_online > 0 ||
          liveOperations.plant.warning > 0
        ? "Degraded"
        : "Operational"

  const systemStatusColor =
    systemStatus === "Operational"
      ? "bg-emerald-400"
      : systemStatus === "Connecting"
        ? "bg-gray-400"
        : systemStatus === "Degraded"
          ? "bg-amber-400"
          : "bg-red-400"

  const allMachinesReporting =
    liveOperations !== null &&
    liveOperations.plant.machines_total > 0 &&
    liveOperations.plant.machines_online ===
      liveOperations.plant.machines_total


  return (
    <div className="min-h-screen bg-[#0a0f1a] text-gray-100">

      {/* HEADER */}

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0d1422]/95 backdrop-blur">

        <div className="flex min-h-16 flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">

          {/* BRAND */}

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10">
              <Factory className="h-5 w-5 text-cyan-400" />
            </div>

            <div>
              <h1 className="text-sm font-semibold tracking-wide">
                ForgeTwin AI
              </h1>

              <p className="text-xs text-gray-500">
                Manufacturing Operations Platform
              </p>
            </div>

          </div>


          {/* NAVIGATION */}

          <nav className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#080d17] p-1">

            <NavButton
              active={activeView === "dashboard"}
              onClick={() =>
                setActiveView("dashboard")
              }
              icon={
                <LayoutDashboard className="h-4 w-4" />
              }
              label="Dashboard"
            />

            <NavButton
              active={activeView === "copilot"}
              onClick={() =>
                setActiveView("copilot")
              }
              icon={
                <Bot className="h-4 w-4" />
              }
              label="AI Copilot"
            />

            <NavButton
              active={activeView === "energy"}
              onClick={() =>
                setActiveView("energy")
              }
              icon={
                <BarChart3 className="h-4 w-4" />
              }
              label="Energy"
            />

            <NavButton
              active={activeView === "incidents"}
              onClick={() =>
                setActiveView("incidents")
              }
              icon={
                <AlertTriangle className="h-4 w-4" />
              }
              label="Incident Center"
              badge={incidents.length}
            />

          </nav>


          {/* SYSTEM STATUS */}

          <div className="flex items-center gap-5">

            <div
              className="flex items-center gap-2 text-xs text-gray-300"
              role="status"
              aria-live="polite"
            >
              <span
                className={`h-2 w-2 rounded-full ${systemStatusColor}`}
              />
              {systemStatus}
            </div>

            <Settings className="h-5 w-5 text-gray-500" />

          </div>

        </div>

      </header>


      {/* SEPARATE INCIDENT CENTER PAGE */}

      {activeView === "copilot" ? (
        <main className="p-4 lg:p-6">
          <div className="mb-6">
            <p className="text-sm text-cyan-400">
              AI OPERATIONS
            </p>

            <h2 className="mt-1 text-2xl font-semibold">
              Operations Copilot
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Evidence-grounded AI assistance for machine
              health, anomalies, and maintenance decisions
            </p>
          </div>

          <Suspense fallback={<FeatureLoading label="Loading AI Copilot..." />}>
            <OperationsCopilot machine={selectedMachine} />
          </Suspense>
        </main>
      ) : activeView === "energy" ? (
        <main className="p-4 lg:p-6">
          <Suspense fallback={<FeatureLoading label="Loading energy analytics..." />}>
            <EnergyIntelligence machine={selectedMachine} />
          </Suspense>
        </main>
      ) : activeView === "incidents" ? (
        <Suspense fallback={<FeatureLoading label="Loading incident center..." />}>
          <IncidentCenter />
        </Suspense>
      ) : (

        /* DASHBOARD */

        <main className="p-4 lg:p-6">

          {/* PAGE HEADER */}

          <div className="mb-6">

            <p className="text-sm text-cyan-400">
              OPERATIONS CENTER
            </p>

            <h2 className="mt-1 text-2xl font-semibold">
              Plant Command Dashboard
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Real-time manufacturing intelligence
              and machine health monitoring
            </p>

          </div>


          {/* KPI CARDS */}

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

            <MetricCard
              title="Total Machines"
              value={dashboard.total_machines}
              subtitle="Registered assets"
              icon={
                <Factory className="h-5 w-5" />
              }
            />

            <MetricCard
              title="Online Machines"
              value={dashboard.online_machines}
              subtitle="Currently reporting"
              icon={
                <Activity className="h-5 w-5" />
              }
            />

            <MetricCard
              title="Healthy Machines"
              value={dashboard.healthy_machines}
              subtitle="Operating normally"
              icon={
                <ShieldCheck className="h-5 w-5" />
              }
            />

            <MetricCard
              title="Active Incidents"
              value={incidents.length}
              subtitle="Requires attention"
              icon={
                <AlertTriangle className="h-5 w-5" />
              }
            />

          </section>


          {/* LIVE OPERATIONS */}

          <section className="mt-6 rounded-xl border border-white/10 bg-[#0d1422] p-5">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      allMachinesReporting
                        ? "bg-emerald-400"
                        : liveOperations
                          ? "bg-amber-400"
                          : "bg-gray-500"
                    }`}
                  />
                  <p className="text-sm font-medium">
                    Live Plant Operations
                  </p>
                </div>

                <p className="mt-1 text-xs text-gray-500">
                  {!liveOperations
                    ? "Connecting to operations service..."
                    : allMachinesReporting
                      ? "All machines are reporting telemetry"
                      : `${liveOperations.plant.machines_offline} machine(s) offline. Displayed readings may be last-known values.`}
                </p>
              </div>

              <span className="text-[10px] uppercase tracking-wide text-gray-600">
                Auto refresh · 5s
              </span>

            </div>

            {liveOperations ? (
              <LiveOperationsPanel data={liveOperations} />
            ) : (
              <div className="mt-5 rounded-lg border border-dashed border-white/10 bg-[#0a101c] p-6 text-center">
                <RefreshCw className="mx-auto h-6 w-6 animate-spin text-cyan-400" />
                <p className="mt-3 text-xs text-gray-500">
                  Connecting to live operations...
                </p>
              </div>
            )}

          </section>


          {/* PLANT OVERVIEW + MACHINE STATUS */}

          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">

            {/* PLANT OVERVIEW */}

            <div className="rounded-xl border border-white/10 bg-[#0d1422] p-5 xl:col-span-2">

              <div className="flex items-center justify-between">

                <div>
                  <h3 className="font-medium">
                    Plant Overview
                  </h3>

                  <p className="mt-1 text-xs text-gray-500">
                    Interactive manufacturing environment
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      allMachinesReporting
                        ? "bg-emerald-400"
                        : "bg-amber-400"
                    }`}
                  />
                  {allMachinesReporting ? "Live" : "Connectivity Degraded"}
                </div>

              </div>


              {/* PLANT FLOOR */}

              <div className="mt-5 rounded-lg border border-white/10 bg-[#080d17] p-5">

                <div className="relative min-h-[320px] overflow-hidden rounded-lg border border-white/5 bg-[#0a101c]">

                  {/* GRID */}

                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
                      backgroundSize: "32px 32px",
                    }}
                  />


                  {/* ZONES */}

                  <div className="absolute left-4 top-4 text-[10px] uppercase tracking-widest text-gray-600">
                    Zone A
                  </div>

                  <div className="absolute right-4 top-4 text-[10px] uppercase tracking-widest text-gray-600">
                    Zone B
                  </div>


                  {/* MACHINES */}

                  <div className="relative flex min-h-[320px] items-center justify-center gap-8 px-8 pb-24">

                    {dashboard.machines.map(
                      (machine, index) => (
                        <PlantMachine
                          key={machine.id}
                          machine={machine}
                          selected={
                            selectedMachine?.id ===
                            machine.id
                          }
                          onClick={() =>
                            setSelectedMachineId(
                              machine.id,
                            )
                          }
                          index={index}
                        />
                      ),
                    )}

                  </div>


                  {/* SELECTED MACHINE */}

                  {selectedMachine && (
                    <div className="absolute bottom-3 left-3 right-3 rounded-lg border border-white/10 bg-[#0d1422]/95 p-3 backdrop-blur">

                      <div className="flex items-center justify-between">

                        <div>
                          <p className="text-xs font-medium">
                            {selectedMachine.name}
                          </p>

                          <p className="mt-1 text-[10px] text-gray-600">
                            {selectedMachine.machine_code}
                            {" · "}
                            {selectedMachine.location}
                          </p>
                        </div>

                        <div
                          className={`text-right text-xs font-medium ${
                            selectedMachine.status === "offline"
                              ? "text-amber-400"
                              : selectedMachine.status === "critical"
                                ? "text-red-400"
                                : selectedMachine.status === "warning"
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                          }`}
                        >
                          <div>
                            {selectedMachine.status === "offline"
                              ? "Offline"
                              : selectedMachine.status}
                          </div>
                          <div className="mt-1">
                            {selectedMachine.status === "offline"
                              ? `Last-known health: ${selectedMachine.health_score}`
                              : `Health: ${selectedMachine.health_score}`}
                          </div>
                        </div>

                      </div>


                      {selectedMachine.status === "offline" && (
                        <p className="mt-3 rounded-md border border-amber-500/15 bg-amber-500/5 px-3 py-2 text-[10px] text-amber-300">
                          Machine is offline. Sensor values below are not confirmed current readings.
                        </p>
                      )}

                      {selectedMachine.status !==
                        "offline" && (
                        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">

                          <PlantMetric
                            label="Temperature"
                            value={
                              selectedMachine.temperature
                            }
                            unit="°C"
                          />

                          <PlantMetric
                            label="Vibration"
                            value={
                              selectedMachine.vibration
                            }
                            unit="mm/s"
                          />

                          <PlantMetric
                            label="Power"
                            value={
                              selectedMachine.power_consumption
                            }
                            unit="kW"
                          />

                          <PlantMetric
                            label="RPM"
                            value={
                              selectedMachine.rpm
                            }
                            unit="RPM"
                          />

                        </div>
                      )}

                    </div>
                  )}

                </div>

              </div>

            </div>


            {/* MACHINE STATUS */}

            <div className="rounded-xl border border-white/10 bg-[#0d1422] p-5">

              <div className="flex items-center justify-between">

                <div>
                  <h3 className="font-medium">
                    Machine Status
                  </h3>

                  <p className="mt-1 text-xs text-gray-500">
                    Current asset health
                  </p>
                </div>

                <RefreshCw className="h-4 w-4 text-gray-600" />

              </div>


              <div className="mt-5 space-y-3">

                {dashboard.machines.map(
                  (machine) => (
                    <button
                      key={machine.id}
                      type="button"
                      onClick={() =>
                        setSelectedMachineId(
                          machine.id,
                        )
                      }
                      className={`w-full rounded-lg border p-4 text-left transition ${
                        selectedMachine?.id ===
                        machine.id
                          ? "border-cyan-400/30 bg-cyan-400/5"
                          : "border-white/10 bg-[#0a101c] hover:border-white/20"
                      }`}
                    >
                      <MachineStatusContent
                        machine={machine}
                      />
                    </button>
                  ),
                )}

              </div>

            </div>

          </section>


          {/* 3D DIGITAL TWIN */}

          <section className="mt-6">

            <div className="mb-4">

              <p className="text-sm text-cyan-400">
                DIGITAL TWIN
              </p>

              <h3 className="mt-1 text-lg font-medium">
                Interactive Factory Model
              </h3>

              <p className="mt-1 text-xs text-gray-500">
                3D representation of manufacturing assets with
                connectivity and health status
              </p>

            </div>

            <Suspense fallback={<FeatureLoading label="Loading 3D factory model..." />}>
              <DigitalTwin />
            </Suspense>

          </section>


          {/* SELECTED MACHINE TELEMETRY */}

          <section className="mt-6">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-medium">
                {selectedMachine?.status === "offline"
                  ? "Last-Known Telemetry"
                  : "Current Telemetry"}
              </h3>
              {selectedMachine?.status === "offline" && (
                <span className="text-xs text-amber-400">
                  {selectedMachine.machine_code} is offline - readings may be stale
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TelemetryCard
                title={selectedMachine?.status === "offline" ? "Last Temperature" : "Temperature"}
                value={selectedMachine?.temperature}
                unit="°C"
                icon={<Gauge className="h-5 w-5" />}
              />

              <TelemetryCard
                title={selectedMachine?.status === "offline" ? "Last Vibration" : "Vibration"}
                value={selectedMachine?.vibration}
                unit="mm/s"
                icon={<Activity className="h-5 w-5" />}
              />

              <TelemetryCard
                title={selectedMachine?.status === "offline" ? "Last Power Consumption" : "Power Consumption"}
                value={selectedMachine?.power_consumption}
                unit="kW"
                icon={<Zap className="h-5 w-5" />}
              />

              <TelemetryCard
                title={selectedMachine?.status === "offline" ? "Last Machine Speed" : "Machine Speed"}
                value={selectedMachine?.rpm}
                unit="RPM"
                icon={<Gauge className="h-5 w-5" />}
              />
            </div>
          </section>


          {/* TELEMETRY ANALYTICS */}

          <section className="mt-6">

            <div className="mb-4">

              <h3 className="text-lg font-medium">
                Telemetry Analytics
              </h3>

              <p className="mt-1 text-xs text-gray-500">
                Stored sensor history for{" "}
                {selectedMachine?.machine_code ??
                  "selected machine"}
              </p>

            </div>


            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

              <TelemetryChart
                title="Temperature"
                subtitle="Thermal operating trend"
                unit="°C"
                dataKey="temperature"
                data={telemetry}
                icon={
                  <Gauge className="h-4 w-4" />
                }
                stroke="#22d3ee"
              />

              <TelemetryChart
                title="Vibration"
                subtitle="Mechanical vibration trend"
                unit="mm/s"
                dataKey="vibration"
                data={telemetry}
                icon={
                  <Activity className="h-4 w-4" />
                }
                stroke="#f59e0b"
              />

              <TelemetryChart
                title="Power Consumption"
                subtitle="Electrical load trend"
                unit="kW"
                dataKey="power_consumption"
                data={telemetry}
                icon={
                  <Zap className="h-4 w-4" />
                }
                stroke="#a78bfa"
              />

              <TelemetryChart
                title="Machine Speed"
                subtitle="Rotational speed trend"
                unit="RPM"
                dataKey="rpm"
                data={telemetry}
                icon={
                  <Gauge className="h-4 w-4" />
                }
                stroke="#34d399"
              />

            </div>

          </section>


          {/* DASHBOARD INCIDENT SUMMARY */}

          <section className="mt-6 rounded-xl border border-white/10 bg-[#0d1422] p-5">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h3 className="font-medium">
                  Incident Summary
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  Active machine incidents requiring
                  attention
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setActiveView("incidents")
                }
                className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/15"
              >
                Open Incident Center
              </button>

            </div>


            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">

              {incidents.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 bg-[#0a101c] p-6 text-center md:col-span-2">

                  <ShieldCheck className="mx-auto h-8 w-8 text-emerald-500/60" />

                  <p className="mt-3 text-sm text-gray-400">
                    No active incidents
                  </p>

                  <p className="mt-1 text-xs text-gray-600">
                    All monitored machines are
                    operating normally.
                  </p>

                </div>
              ) : (
                incidents
                  .slice(0, 4)
                  .map((incident) => (
                    <IncidentSummaryCard
                      key={incident.id}
                      incident={incident}
                    />
                  ))
              )}

            </div>

          </section>

        </main>
      )}

    </div>
  )
}



function FeatureLoading({ label }: { label: string }) {
  return (
    <div className="grid min-h-[180px] place-items-center rounded-xl border border-white/10 bg-[#0d1422] p-6 text-sm text-gray-400" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <RefreshCw className="h-5 w-5 animate-spin text-cyan-400" />
        <span>{label}</span>
      </div>
    </div>
  )
}

/* =========================================================
   NAVIGATION BUTTON
========================================================= */

function NavButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
  badge?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
        active
          ? "bg-cyan-500/10 text-cyan-400"
          : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
      }`}
    >
      {icon}

      <span className="hidden sm:inline">
        {label}
      </span>

      {badge !== undefined && badge > 0 && (
        <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[9px] text-red-400">
          {badge}
        </span>
      )}
    </button>
  )
}


/* =========================================================
   LIVE OPERATIONS PANEL
========================================================= */

function LiveOperationsPanel({
  data,
}: {
  data: LiveOperationsData
}) {
  const { plant, machines } = data

  return (
    <div className="mt-5 space-y-5">

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <LiveStat label="Machines" value={plant.machines_total} />
        <LiveStat label="Online" value={plant.machines_online} />
        <LiveStat label="Offline" value={plant.machines_offline} />
        <LiveStat label="Healthy" value={plant.healthy} />
        <LiveStat label="Warning" value={plant.warning} />
        <LiveStat label="Critical" value={plant.critical} />
        <LiveStat label="Power" value={`${plant.total_power_kw.toFixed(2)} kW`} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {machines.map((machine) => (
          <div
            key={machine.id}
            className="rounded-lg border border-white/10 bg-[#0a101c] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {machine.name}
                </p>
                <p className="mt-1 text-[10px] text-gray-600">
                  {machine.machine_code} · {machine.location}
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${
                  machine.status === "critical"
                    ? "bg-red-500/10 text-red-400"
                    : machine.status === "warning"
                      ? "bg-amber-500/10 text-amber-400"
                      : machine.status === "offline"
                        ? "bg-gray-500/10 text-gray-500"
                        : "bg-emerald-500/10 text-emerald-400"
                }`}
              >
                {machine.status}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Health Score
              </span>
              <span className="text-sm font-semibold">
                {machine.health_score}
              </span>
            </div>

            {machine.status === "offline" && (
              <p className="mt-1 text-right text-[9px] text-amber-400">
                Last-known score - not a current assessment
              </p>
            )}

            {machine.status === "offline" && (
              <p className="mt-2 rounded-md bg-amber-500/5 px-2 py-1.5 text-[9px] text-amber-300">
                Offline: sensor values below are from the last stored reading.
              </p>
            )}

            <div className="mt-3 grid grid-cols-4 gap-2 border-t border-white/5 pt-3">
              <LiveTelemetry label="Temp" value={`${machine.temperature.toFixed(1)}°C`} />
              <LiveTelemetry label="Vibration" value={`${machine.vibration.toFixed(2)}`} />
              <LiveTelemetry label="Power" value={`${machine.power_consumption.toFixed(2)} kW`} />
              <LiveTelemetry label="RPM" value={`${machine.rpm.toFixed(0)}`} />
            </div>

            <p className="mt-3 text-[9px] text-gray-600">
              {machine.status === "offline" ? "Last reading" : "Last updated"}:{" "}
              {new Date(machine.last_updated).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-white/5 pt-3">
        <span className="text-xs text-gray-500">
          Active incidents: {plant.active_incidents}
        </span>
        <span className="text-[10px] text-gray-600">
          Snapshot {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>

    </div>
  )
}


function LiveStat({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-[#0a101c] p-3">
      <p className="text-[10px] uppercase tracking-wide text-gray-600">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-gray-200">
        {value}
      </p>
    </div>
  )
}


function LiveTelemetry({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <p className="text-[9px] text-gray-600">{label}</p>
      <p className="mt-1 truncate text-[10px] font-medium text-gray-300">
        {value}
      </p>
    </div>
  )
}


/* =========================================================
   PLANT MACHINE
========================================================= */

function PlantMachine({
  machine,
  selected,
  onClick,
  index,
}: {
  machine: Machine
  selected: boolean
  onClick: () => void
  index: number
}) {
  const isOffline =
    machine.status === "offline"

  const isCritical =
    machine.status === "critical"

  const isWarning =
    machine.status === "warning"

  const statusColor =
    isOffline
      ? "border-gray-700 bg-gray-900"
      : isCritical
        ? "border-red-500/40 bg-red-500/10"
        : isWarning
          ? "border-amber-500/40 bg-amber-500/10"
          : "border-emerald-500/40 bg-emerald-500/10"

  const iconColor =
    isOffline
      ? "text-gray-600"
      : isCritical
        ? "text-red-400"
        : isWarning
          ? "text-amber-400"
          : "text-emerald-400"

  const statusDot =
    isOffline
      ? "bg-gray-600"
      : isCritical
        ? "bg-red-400"
        : isWarning
          ? "bg-amber-400"
          : "bg-emerald-400"

  const statusText =
    isOffline
      ? "text-gray-600"
      : isCritical
        ? "text-red-400"
        : isWarning
          ? "text-amber-400"
          : "text-emerald-400"

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-44 rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-1 hover:border-cyan-400/50 ${statusColor} ${
        selected
          ? "ring-2 ring-cyan-400/30"
          : ""
      }`}
      style={{
        transform:
          index % 2 === 0
            ? "translateY(-12px)"
            : "translateY(12px)",
      }}
    >
      <div className="flex items-center justify-between">

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5">
          <Factory
            className={`h-5 w-5 ${iconColor}`}
          />
        </div>

        <span
          className={`h-2 w-2 rounded-full ${statusDot}`}
        />

      </div>

      <p className="mt-3 text-xs font-medium text-gray-200">
        {machine.machine_code}
      </p>

      <p className="mt-1 truncate text-[10px] text-gray-500">
        {machine.name}
      </p>

      <div className="mt-3 flex items-center justify-between">

        <span className="text-[10px] uppercase text-gray-600">
          {machine.location}
        </span>

        <span
          className={`text-[10px] ${statusText}`}
        >
          {machine.status}
        </span>

      </div>
    </button>
  )
}


/* =========================================================
   PLANT METRIC
========================================================= */

function PlantMetric({
  label,
  value,
  unit,
}: {
  label: string
  value: number | null | undefined
  unit: string
}) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wide text-gray-600">
        {label}
      </p>

      <p className="mt-1 text-xs font-medium text-gray-300">
        {value ?? "—"}

        {value !== null &&
          value !== undefined && (
            <span className="ml-1 text-[9px] text-gray-600">
              {unit}
            </span>
          )}
      </p>
    </div>
  )
}


/* =========================================================
   MACHINE STATUS
========================================================= */

function MachineStatusContent({
  machine,
}: {
  machine: Machine
}) {
  const isHealthy =
    machine.status === "healthy"

  const isOffline =
    machine.status === "offline"

  const isCritical =
    machine.status === "critical"

  return (
    <>
      <div className="flex items-center justify-between">

        <div>
          <p className="text-sm font-medium">
            {machine.name}
          </p>

          <p className="mt-1 text-xs text-gray-600">
            {machine.machine_code} ·{" "}
            {machine.location}
          </p>
        </div>

        <span
          className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] ${
            isHealthy
              ? "bg-emerald-500/10 text-emerald-400"
              : isCritical
                ? "bg-red-500/10 text-red-400"
                : isOffline
                  ? "bg-gray-500/10 text-gray-500"
                  : "bg-amber-500/10 text-amber-400"
          }`}
        >
          {isOffline ? (
            <WifiOff className="h-3 w-3" />
          ) : (
            <Wifi className="h-3 w-3" />
          )}

          {machine.status}
        </span>

      </div>

      <div className="mt-4 flex items-center justify-between">

        <span className="text-xs text-gray-500">
          Health Score
        </span>

        <span className="text-sm font-semibold">
          {machine.health_score}
        </span>

      </div>

      {isOffline && (
        <p className="mt-1 text-right text-[9px] text-amber-400">
          Last-known score - not a current assessment
        </p>
      )}
    </>
  )
}


/* =========================================================
   TELEMETRY CHART
========================================================= */

function TelemetryChart({
  title,
  subtitle,
  unit,
  dataKey,
  data,
  icon,
  stroke,
}: {
  title: string
  subtitle: string
  unit: string
  dataKey: keyof TelemetryReading
  data: TelemetryReading[]
  icon: ReactNode
  stroke: string
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0d1422] p-5">

      <div className="flex items-start justify-between">

        <div className="flex items-center gap-3">

          <div className="rounded-lg bg-white/5 p-2 text-gray-400">
            {icon}
          </div>

          <div>
            <h4 className="text-sm font-medium">
              {title}
            </h4>

            <p className="mt-1 text-xs text-gray-600">
              {subtitle}
            </p>
          </div>

        </div>

        <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-gray-500">
          {unit}
        </span>

      </div>


      <div className="mt-5 h-[250px] w-full">

        {data.length === 0 ? (
          <div className="grid h-full place-items-center rounded-lg border border-dashed border-white/10">

            <div className="text-center">

              <Activity className="mx-auto h-8 w-8 text-gray-700" />

              <p className="mt-2 text-xs text-gray-500">
                No telemetry data available
              </p>

            </div>

          </div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <LineChart
              data={data}
              margin={{
                top: 10,
                right: 10,
                left: -15,
                bottom: 5,
              }}
            >

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
              />

              <XAxis
                dataKey="recorded_at"
                tickFormatter={(value) =>
                  new Date(
                    String(value),
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                }
                tick={{
                  fill: "#6b7280",
                  fontSize: 9,
                }}
                axisLine={false}
                tickLine={false}
                minTickGap={25}
              />

              <YAxis
                tick={{
                  fill: "#6b7280",
                  fontSize: 9,
                }}
                axisLine={false}
                tickLine={false}
                width={45}
              />

              <Tooltip
                labelFormatter={(value) =>
                  String(value)
                }
                formatter={(value) => [
                  `${Number(
                    value ?? 0,
                  ).toFixed(2)} ${unit}`,
                  title,
                ]}
                contentStyle={{
                  backgroundColor: "#0d1422",
                  border:
                    "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#e5e7eb",
                }}
              />

              <Line
                type="monotone"
                dataKey={dataKey}
                name={title}
                stroke={stroke}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />

            </LineChart>
          </ResponsiveContainer>
        )}

      </div>


      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">

        <span className="text-[10px] text-gray-600">
          Last {data.length} readings
        </span>

        <span className="text-[10px] text-gray-600">
          Refreshes every 5s · readings may be historical
        </span>

      </div>

    </div>
  )
}


/* =========================================================
   KPI CARD
========================================================= */

function MetricCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string
  value: number | null | undefined
  subtitle: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0d1422] p-5">

      <div className="flex items-start justify-between">

        <div>
          <p className="text-xs text-gray-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-semibold">
            {value ?? "—"}
          </p>

          <p className="mt-1 text-xs text-gray-600">
            {subtitle}
          </p>
        </div>

        <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
          {icon}
        </div>

      </div>

    </div>
  )
}


/* =========================================================
   TELEMETRY CARD
========================================================= */

function TelemetryCard({
  title,
  value,
  unit,
  icon,
}: {
  title: string
  value: number | null | undefined
  unit: string
  icon: ReactNode
}) {
  const hasValue =
    value !== null &&
    value !== undefined

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d1422] p-5">

      <div className="flex items-center gap-2 text-gray-500">
        {icon}

        <span className="text-xs">
          {title}
        </span>
      </div>

      <div className="mt-4 flex items-baseline gap-2">

        <span className="text-2xl font-semibold">
          {hasValue ? value : "—"}
        </span>

        {hasValue && (
          <span className="text-xs text-gray-600">
            {unit}
          </span>
        )}

      </div>

    </div>
  )
}


/* =========================================================
   INCIDENT SUMMARY CARD
========================================================= */

function IncidentSummaryCard({
  incident,
}: {
  incident: Incident
}) {
  const isCritical =
    incident.severity === "critical"

  return (
    <div
      className={`rounded-lg border p-4 ${
        isCritical
          ? "border-red-500/20 bg-red-500/5"
          : "border-amber-500/20 bg-amber-500/5"
      }`}
    >

      <div className="flex items-start justify-between gap-3">

        <div>

          <div className="flex items-center gap-2">

            <span
              className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase ${
                isCritical
                  ? "bg-red-500/10 text-red-400"
                  : "bg-amber-500/10 text-amber-400"
              }`}
            >
              {incident.severity}
            </span>

            <span className="text-xs text-gray-600">
              #{incident.id}
            </span>

          </div>

          <h4 className="mt-3 text-sm font-medium">
            {incident.title}
          </h4>

          <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500">
            {incident.description}
          </p>

        </div>

        <span className="shrink-0 rounded-full bg-white/5 px-3 py-1 text-[10px] uppercase text-gray-400">
          {incident.status}
        </span>

      </div>


      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 md:grid-cols-4">

        <IncidentMetric
          label="Temperature"
          value={incident.temperature}
          unit="°C"
        />

        <IncidentMetric
          label="Vibration"
          value={incident.vibration}
          unit="mm/s"
        />

        <IncidentMetric
          label="Power"
          value={incident.power_consumption}
          unit="kW"
        />

        <IncidentMetric
          label="RPM"
          value={incident.rpm}
          unit="RPM"
        />

      </div>


      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">

        <span className="text-xs text-gray-600">
          Health Score
        </span>

        <span
          className={`text-sm font-semibold ${
            isCritical
              ? "text-red-400"
              : "text-amber-400"
          }`}
        >
          {incident.health_score}
        </span>

      </div>

    </div>
  )
}


/* =========================================================
   INCIDENT METRIC
========================================================= */

function IncidentMetric({
  label,
  value,
  unit,
}: {
  label: string
  value: number | null | undefined
  unit: string
}) {
  return (
    <div>

      <p className="text-[10px] uppercase tracking-wide text-gray-600">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium">
        {value ?? "—"}

        {value !== null &&
          value !== undefined && (
            <span className="ml-1 text-[10px] text-gray-600">
              {unit}
            </span>
          )}
      </p>

    </div>
  )
}


/* =========================================================
   LOADING SCREEN
========================================================= */

function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#0a0f1a] text-gray-100">

      <div className="text-center">

        <RefreshCw className="mx-auto h-8 w-8 animate-spin text-cyan-400" />

        <p className="mt-4 text-sm text-gray-400">
          Loading ForgeTwin AI...
        </p>

      </div>

    </div>
  )
}


/* =========================================================
   ERROR SCREEN
========================================================= */

function ErrorScreen({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#0a0f1a] text-gray-100">

      <div className="max-w-md text-center">

        <AlertTriangle className="mx-auto h-10 w-10 text-amber-400" />

        <h2 className="mt-4 text-lg font-semibold">
          Dashboard unavailable
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          {message}
        </p>

        <button
          type="button"
          onClick={onRetry}
          className="mt-5 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-cyan-400"
        >
          Retry
        </button>

      </div>

    </div>
  )
}


export default App