import { lazy, Suspense, useEffect, useState } from "react"

const DigitalTwinScene = lazy(() => import("./DigitalTwinScene"))


import {

  getDashboard,

  getMachineAnomaly,
  getMachineMaintenance,

} from "../../services/api"



import type {

  AnomalyAnalysis,

  MaintenanceAssessment,

  Machine,

} from "../../services/api"





// =========================================================

// STATUS COLORS

// =========================================================



function getStatusColor(status: string) {

  switch (status) {

    case "healthy":

      return "#10b981"



    case "warning":

      return "#f59e0b"



    case "critical":

      return "#ef4444"



    case "offline":

      return "#64748b"



    default:

      return "#64748b"

  }

}





// =========================================================

// RISK COLORS

// =========================================================



function getRiskColor(riskLevel: string) {

  switch (riskLevel.toLowerCase()) {

    case "normal":

      return "#10b981"



    case "warning":

      return "#f59e0b"



    case "critical":

      return "#ef4444"



    default:

      return "#64748b"

  }

}





// =========================================================

// SELECTED MACHINE PANEL

// =========================================================



function SelectedMachinePanel({

  machine,

  anomaly,

  anomalyLoading,

  anomalyError,

  onClose,

}: {

  machine: Machine

  anomaly: AnomalyAnalysis | null

  anomalyLoading: boolean

  anomalyError: string | null

  onClose: () => void

}) {

  const statusColor = getStatusColor(

    machine.status,

  )



  const riskColor = anomaly

    ? getRiskColor(anomaly.risk_level)

    : "#64748b"



  const [maintenance, setMaintenance] =
    useState<MaintenanceAssessment | null>(null)

  const [maintenanceLoading, setMaintenanceLoading] =
    useState(false)

  const [maintenanceError, setMaintenanceError] =
    useState<string | null>(null)



  useEffect(() => {
    let cancelled = false

    const loadMaintenance = async () => {
      if (machine.status === "offline") {
        setMaintenance(null)
        setMaintenanceLoading(false)
        setMaintenanceError(
          "Machine is offline. No telemetry available for maintenance assessment.",
        )
        return
      }

      try {
        setMaintenanceLoading(true)
        setMaintenanceError(null)

        const result = await getMachineMaintenance(machine.id)

        if (!cancelled) {
          setMaintenance(result)
        }
      } catch (err) {
        console.error(
          "Machine maintenance assessment failed:",
          err,
        )
        if (!cancelled) {
          setMaintenance(null)
          setMaintenanceError(
            "Predictive maintenance assessment is currently unavailable.",
          )
        }
      } finally {
        if (!cancelled) {
          setMaintenanceLoading(false)
        }
      }
    }

    loadMaintenance()

    const interval = window.setInterval(
      loadMaintenance,
      5000,
    )

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [machine.id, machine.status])



  return (

    <div className="absolute left-4 top-4 z-20 w-[310px] max-h-[calc(100%-32px)] overflow-y-auto rounded-xl border border-white/10 bg-[#0b1220]/95 p-4 shadow-2xl backdrop-blur-md">



      {/* =================================================

          HEADER

      ================================================= */}



      <div className="flex items-start justify-between">



        <div>



          <p className="text-[10px] uppercase tracking-widest text-cyan-400">

            Selected Machine

          </p>



          <h4 className="mt-1 text-base font-semibold text-white">

            {machine.machine_code}

          </h4>



          <p className="mt-1 text-xs text-gray-500">

            {machine.name}

          </p>



        </div>



        <button

          type="button"

          onClick={onClose}

          className="rounded-md px-2 py-1 text-xs text-gray-500 transition hover:bg-white/10 hover:text-white"

        >

          ✕

        </button>



      </div>





      {/* =================================================

          OPERATIONAL STATUS

      ================================================= */}



      <div className="mt-4 flex items-center justify-between border-b border-white/10 pb-3">



        <span className="text-xs text-gray-500">

          Operational Status

        </span>



        <span

          className="text-xs font-semibold uppercase"

          style={{

            color: statusColor,

          }}

        >

          {machine.status}

        </span>



      </div>





      {/* =================================================

          MACHINE METRICS

      ================================================= */}



      <div className="mt-4 grid grid-cols-2 gap-3">



        <Metric

          label="Health"

          value={machine.health_score.toFixed(0)}

          unit="%"

        />



        <Metric

          label="Temperature"

          value={

            machine.temperature !== null

              ? machine.temperature.toFixed(1)

              : "—"

          }

          unit="°C"

        />



        <Metric

          label="Vibration"

          value={

            machine.vibration !== null

              ? machine.vibration.toFixed(2)

              : "—"

          }

          unit="mm/s"

        />



        <Metric

          label="Power"

          value={

            machine.power_consumption !== null

              ? machine.power_consumption.toFixed(1)

              : "—"

          }

          unit="kW"

        />



        <Metric

          label="Speed"

          value={

            machine.rpm !== null

              ? machine.rpm.toFixed(0)

              : "—"

          }

          unit="RPM"

        />



        <Metric

          label="Location"

          value={machine.location}

          unit=""

        />



      </div>





      {/* =================================================

          AI ANOMALY INTELLIGENCE

      ================================================= */}



      <div className="mt-4 rounded-lg border border-cyan-400/10 bg-cyan-950/10 p-3">



        <div className="flex items-center justify-between">



          <div>

            <p className="text-[9px] uppercase tracking-widest text-cyan-400">

              AI Intelligence

            </p>



            <p className="mt-1 text-xs font-medium text-gray-300">

              Anomaly Detection

            </p>

          </div>



          <div className="rounded-md border border-cyan-400/10 bg-cyan-400/5 px-2 py-1">

            <span className="text-[9px] text-cyan-400">

              ML

            </span>

          </div>



        </div>





        {/* -------------------------------------------------

            LOADING

        ------------------------------------------------- */}



        {anomalyLoading && (

          <div className="mt-3 flex items-center gap-2">



            <div className="h-3 w-3 animate-spin rounded-full border border-cyan-400/20 border-t-cyan-400" />



            <span className="text-[10px] text-gray-500">

              Analyzing machine telemetry...

            </span>



          </div>

        )}





        {/* -------------------------------------------------

            ERROR

        ------------------------------------------------- */}



        {!anomalyLoading && anomalyError && (

          <div className="mt-3 rounded-md border border-white/5 bg-white/[0.02] p-2">



            <p className="text-[10px] text-gray-500">

              {anomalyError}

            </p>



          </div>

        )}





        {/* -------------------------------------------------

            ANOMALY RESULT

        ------------------------------------------------- */}



        {!anomalyLoading && anomaly && (

          <>



            <div className="mt-3 flex items-center justify-between">



              <span className="text-[10px] text-gray-500">

                Risk Level

              </span>



              <span

                className="text-[10px] font-bold uppercase"

                style={{

                  color: riskColor,

                }}

              >

                {anomaly.risk_level}

              </span>



            </div>





            <div className="mt-3 grid grid-cols-2 gap-2">



              <Metric

                label="Anomaly Score"

                value={anomaly.anomaly_score.toFixed(1)}

                unit="/100"

              />



              <Metric

                label="Detection"

                value={

                  anomaly.is_anomaly

                    ? "Detected"

                    : "Normal"

                }

                unit=""

              />



            </div>





            {/* -------------------------------------------------

                ANOMALY SCORE BAR

            ------------------------------------------------- */}



            <div className="mt-3">



              <div className="mb-1 flex items-center justify-between">



                <span className="text-[9px] uppercase tracking-wide text-gray-600">

                  Anomaly Score

                </span>



                <span className="text-[9px] text-gray-500">

                  {anomaly.anomaly_score.toFixed(1)}

                </span>



              </div>



              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">



                <div

                  className="h-full rounded-full transition-all duration-500"

                  style={{

                    width: `${Math.min(

                      Math.max(

                        anomaly.anomaly_score,

                        0,

                      ),

                      100,

                    )}%`,

                    backgroundColor: riskColor,

                  }}

                />



              </div>



            </div>





            {/* -------------------------------------------------

                MODEL EVIDENCE

            ------------------------------------------------- */}



            <div className="mt-3 border-t border-white/5 pt-3">



              <p className="text-[9px] uppercase tracking-wide text-gray-600">

                Model Evidence

              </p>



              <div className="mt-2 grid grid-cols-2 gap-2">



                <Metric

                  label="Training Records"

                  value={String(

                    anomaly.training_records,

                  )}

                  unit=""

                />



                <Metric

                  label="Telemetry ID"

                  value={String(

                    anomaly.telemetry_id,

                  )}

                  unit=""

                />



              </div>



            </div>





            {/* -------------------------------------------------

                ANALYSIS MESSAGE

            ------------------------------------------------- */}



            <div className="mt-3 rounded-md border border-white/5 bg-white/[0.02] p-2">



              {anomaly.is_anomaly ? (

                <p className="text-[10px] leading-4 text-red-300">

                  Machine telemetry shows an anomalous

                  operating pattern. Further inspection

                  is recommended.

                </p>

              ) : anomaly.risk_level === "warning" ? (

                <p className="text-[10px] leading-4 text-amber-300">

                  No confirmed anomaly was detected,

                  but the telemetry shows moderate

                  deviation from the learned baseline.

                </p>

              ) : (

                <p className="text-[10px] leading-4 text-emerald-300">

                  Machine telemetry is currently

                  consistent with the learned operating

                  pattern.

                </p>

              )}



            </div>



          </>

        )}



      </div>

      {/* =================================================
          PREDICTIVE MAINTENANCE
      ================================================= */}

      <div className="mt-4 rounded-lg border border-amber-400/10 bg-amber-950/10 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-amber-400">
              Predictive Maintenance
            </p>
            <p className="mt-1 text-xs font-medium text-gray-300">
              Maintenance Assessment
            </p>
          </div>
          <div className="rounded-md border border-amber-400/10 bg-amber-400/5 px-2 py-1">
            <span className="text-[9px] text-amber-400">AI</span>
          </div>
        </div>

        {maintenanceLoading && (
          <div className="mt-3 flex items-center gap-2">
            <div className="h-3 w-3 animate-spin rounded-full border border-amber-400/20 border-t-amber-400" />
            <span className="text-[10px] text-gray-500">
              Assessing maintenance risk...
            </span>
          </div>
        )}

        {!maintenanceLoading && maintenanceError && (
          <div className="mt-3 rounded-md border border-white/5 bg-white/[0.02] p-2">
            <p className="text-[10px] text-gray-500">{maintenanceError}</p>
          </div>
        )}

        {!maintenanceLoading && maintenance && (
          <>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] text-gray-500">
                Maintenance Priority
              </span>
              <span
                className="text-[10px] font-bold uppercase"
                style={{
                  color:
                    maintenance.maintenance_priority === "critical"
                      ? "#ef4444"
                      : maintenance.maintenance_priority === "high"
                        ? "#f59e0b"
                        : maintenance.maintenance_priority === "medium"
                          ? "#38bdf8"
                          : "#10b981",
                }}
              >
                {maintenance.maintenance_priority}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Metric
                label="Health"
                value={maintenance.health_score.toFixed(0)}
                unit="%"
              />
              <Metric
                label="Risk"
                value={maintenance.risk_level}
                unit=""
              />
            </div>

            <div className="mt-3 border-t border-white/5 pt-3">
              <p className="text-[9px] uppercase tracking-wide text-gray-600">
                Telemetry Trends
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <TrendMetric label="Temperature" value={maintenance.temperature_trend} />
                <TrendMetric label="Vibration" value={maintenance.vibration_trend} />
                <TrendMetric label="Power" value={maintenance.power_trend} />
                <TrendMetric label="RPM" value={maintenance.rpm_trend} />
              </div>
            </div>

            <div className="mt-3 border-t border-white/5 pt-3">
              <p className="text-[9px] uppercase tracking-wide text-gray-600">
                Evidence
              </p>

              {maintenance.evidence.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {maintenance.evidence.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="rounded-md border border-white/5 bg-white/[0.02] p-2"
                    >
                      <p className="text-[10px] leading-4 text-gray-400">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[10px] text-emerald-300">
                  No significant maintenance indicators detected.
                </p>
              )}
            </div>

            <div className="mt-3 rounded-md border border-amber-400/10 bg-amber-400/[0.03] p-2">
              <p className="text-[9px] uppercase tracking-wide text-amber-400">
                Recommended Action
              </p>
              <p className="mt-1 text-[10px] leading-4 text-gray-300">
                {maintenance.recommended_action}
              </p>
            </div>
          </>
        )}
      </div>







      {/* =================================================

          OFFLINE MESSAGE

      ================================================= */}



      {machine.status === "offline" && (

        <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-3">



          <p className="text-xs font-medium text-gray-400">

            No telemetry available

          </p>



          <p className="mt-1 text-[10px] leading-4 text-gray-600">

            This machine is currently offline and has

            not reported sensor telemetry.

          </p>



        </div>

      )}



    </div>

  )

}





// =========================================================

// METRIC

// =========================================================



function Metric({

  label,

  value,

  unit,

}: {

  label: string

  value: string

  unit: string

}) {

  return (

    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">



      <p className="text-[9px] uppercase tracking-wide text-gray-600">

        {label}

      </p>



      <p className="mt-1 text-sm font-medium text-gray-200">



        {value}



        {unit && (

          <span className="ml-1 text-[9px] text-gray-600">

            {unit}

          </span>

        )}



      </p>



    </div>

  )

}






// =========================================================
// TREND METRIC
// =========================================================

function TrendMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  const trendColor =
    value === "increasing"
      ? "#f59e0b"
      : value === "decreasing"
        ? "#38bdf8"
        : value === "stable"
          ? "#10b981"
          : "#64748b"

  const trendSymbol =
    value === "increasing"
      ? "↑"
      : value === "decreasing"
        ? "↓"
        : value === "stable"
          ? "→"
          : "—"

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
      <p className="text-[9px] uppercase tracking-wide text-gray-600">
        {label}
      </p>

      <div className="mt-1 flex items-center justify-between gap-2">
        <span
          className="text-sm font-semibold"
          style={{ color: trendColor }}
        >
          {trendSymbol}
        </span>

        <span
          className="text-[9px] font-medium uppercase"
          style={{ color: trendColor }}
        >
          {value.replace("_", " ")}
        </span>
      </div>
    </div>
  )
}

// =========================================================

// DIGITAL TWIN

// =========================================================



export default function DigitalTwin() {



  const [machines, setMachines] =

    useState<Machine[]>([])



  const [selectedMachineId, setSelectedMachineId] =

    useState<number | null>(null)



  const [anomaly, setAnomaly] =

    useState<AnomalyAnalysis | null>(null)



  const [anomalyLoading, setAnomalyLoading] =

    useState(false)



  const [anomalyError, setAnomalyError] =

    useState<string | null>(null)



  
const [loading, setLoading] =

    useState(true)



  const [error, setError] =

    useState<string | null>(null)





  // =======================================================

  // LOAD MACHINE DATA

  // =======================================================



  const loadMachines = async () => {



    try {



      const dashboard =

        await getDashboard()



      setMachines(

        dashboard.machines,

      )



      setError(null)



    } catch (err) {



      console.error(

        "Digital Twin failed to load:",

        err,

      )



      setError(

        "Unable to load machine data.",

      )



    } finally {



      setLoading(false)



    }



  }





  // =======================================================

  // LOAD MACHINE ANOMALY

  // =======================================================



  const loadAnomaly = async (

    machineId: number,

  ) => {



    const machine = machines.find(

      (item) => item.id === machineId,

    )



    // -------------------------------------------------------

    // Offline machine

    // -------------------------------------------------------



    if (

      machine &&

      machine.status === "offline"

    ) {

      setAnomaly(null)

      setAnomalyLoading(false)

      setAnomalyError(

        "Machine is offline. No telemetry available for anomaly analysis.",

      )

      return

    }



    try {



      setAnomalyLoading(true)

      setAnomalyError(null)



      const result =

        await getMachineAnomaly(

          machineId,

        )



      setAnomaly(result)



    } catch (err) {



      console.error(

        "Machine anomaly analysis failed:",

        err,

      )



      setAnomaly(null)



      setAnomalyError(

        "Anomaly analysis is currently unavailable.",

      )



    } finally {



      setAnomalyLoading(false)



    }



  }





  
// =======================================================

  // INITIAL LOAD + LIVE REFRESH

  // =======================================================



  useEffect(() => {



    loadMachines()



    const interval =

      window.setInterval(

        loadMachines,

        5000,

      )



    return () => {

      window.clearInterval(interval)

    }



  }, [])





  // =======================================================

  // LOAD ANOMALY WHEN MACHINE IS SELECTED

  // =======================================================



  useEffect(() => {

    if (selectedMachineId === null) {

      setAnomaly(null)
      setAnomalyError(null)
      setAnomalyLoading(false)


      return
    }

    loadAnomaly(
      selectedMachineId,
    )


    const interval =
      window.setInterval(
        () => {
          loadAnomaly(
            selectedMachineId,
          )
        },
        5000,
      )

    return () => {
      window.clearInterval(interval)
    }

  }, [
    selectedMachineId,
  ])



  // =======================================================

  // SELECTED MACHINE

  // =======================================================



  const selectedMachine =

    machines.find(

      (machine) =>

        machine.id === selectedMachineId,

    ) ?? null





  // =======================================================

  // RENDER

  // =======================================================



  return (

    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#020617]">





      {/* ===================================================

          LOADING OVERLAY

      =================================================== */}



      {loading && (

        <div className="absolute inset-0 z-30 grid place-items-center bg-[#020617]/90">



          <div className="text-center">



            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400" />



            <p className="mt-3 text-xs text-gray-500">

              Loading Digital Twin...

            </p>



          </div>



        </div>

      )}





      {/* ===================================================

          ERROR OVERLAY

      =================================================== */}



      {error && !loading && (

        <div className="absolute inset-0 z-30 grid place-items-center bg-[#020617]/90">



          <div className="text-center">



            <p className="text-sm text-red-400">

              {error}

            </p>



            <button

              type="button"

              onClick={loadMachines}

              className="mt-3 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-medium text-black hover:bg-cyan-400"

            >

              Retry

            </button>



          </div>



        </div>

      )}





      {/* ===================================================

          SELECTED MACHINE PANEL

      =================================================== */}



      {selectedMachine && (

        <SelectedMachinePanel

          machine={selectedMachine}

          anomaly={anomaly}

          anomalyLoading={anomalyLoading}

          anomalyError={anomalyError}

          onClose={() =>

            setSelectedMachineId(null)

          }

        />

      )}





      {/* ===================================================

          3D CANVAS

      =================================================== */}



      <div className="h-[480px] w-full">



                <Suspense fallback={
          <div className="grid h-[480px] w-full place-items-center text-xs text-gray-500" role="status">
            Loading 3D factory scene...
          </div>
        }>
          <DigitalTwinScene
            machines={machines}
            selectedMachineId={selectedMachineId}
            onSelectMachine={setSelectedMachineId}
            onClearSelection={() => setSelectedMachineId(null)}
          />
        </Suspense>



      </div>





      {/* ===================================================

          DIGITAL TWIN STATUS BAR

      =================================================== */}



      <div className="flex items-center justify-between border-t border-white/10 bg-[#0b1220] px-4 py-3">



        <div className="flex items-center gap-2">



          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />



          <span className="text-[10px] uppercase tracking-widest text-gray-500">

            Live Digital Twin

          </span>



        </div>



        <div className="text-[10px] text-gray-600">

          {machines.length} Assets Connected

        </div>



      </div>



    </div>

  )

}