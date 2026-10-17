import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock3,
  Loader2,
  Send,
  Sparkles,
  User,
} from "lucide-react"


type Machine = {
  id: number
  machine_code: string
  name: string
  machine_type: string
  location: string
  status: string
  temperature?: number | null
  vibration?: number | null
  power_consumption?: number | null
  rpm?: number | null
  health_score: number
}


type EvidenceSnapshot = {
  telemetry_id: number
  recorded_at: string
}


type EvidenceTelemetry = {
  id: number
  machine_id: number
  temperature: number
  vibration: number
  power_consumption: number
  rpm: number
  recorded_at: string
}


type EvidenceHealth = {
  health_score: number
  status: string
  temperature_status: string
  vibration_status: string
  power_status: string
  rpm_status: string
}


type EvidenceAnomaly = {
  machine_id: number
  telemetry_id: number
  recorded_at: string
  is_anomaly: boolean
  anomaly_score: number | null
  risk_level: string
  training_records: number
  analysis_status?: string
  message?: string
}


type EvidenceMaintenance = {
  maintenance_priority: string
  recommended_action: string

  temperature_trend?: string
  vibration_trend?: string
  power_trend?: string
  rpm_trend?: string

  evidence?: string[]

  assessed_at?: string
}


type EvidenceIncident = {
  id: number
  severity: string
  title: string
  description: string
  temperature?: number | null
  vibration?: number | null
  power_consumption?: number | null
  rpm?: number | null
  health_score?: number | null
  status: string
  created_at: string
  resolved_at?: string | null
}


type CopilotEvidence = {
  machine: Machine
  telemetry: EvidenceTelemetry
  health: EvidenceHealth
  anomaly: EvidenceAnomaly
  maintenance: EvidenceMaintenance
  active_incidents: EvidenceIncident[]
}


type CopilotResponse = {
  machine_id: number
  question: string
  answer: string
  evidence_snapshot: EvidenceSnapshot
  evidence: CopilotEvidence
}


type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  evidence?: CopilotEvidence
  snapshot?: EvidenceSnapshot
}


interface OperationsCopilotProps {
  machine: Machine | null
}


const API_BASE_URL = "http://127.0.0.1:8001"


function getSuggestedQuestions(status: string): string[] {
  switch (status) {
    case "offline":
      return [
        "Why is this machine offline?",
        "What was the last recorded telemetry and when was it received?",
        "What should the operator check to restore connectivity?",
        "Were any critical incidents active before the machine went offline?",
      ]

    case "critical":
      return [
        "Why is this machine in critical condition?",
        "What evidence indicates immediate maintenance is required?",
        "What should the operator inspect first?",
        "Explain the current anomaly and its operational risk.",
      ]

    case "warning":
      return [
        "Why is this machine in warning condition?",
        "Which sensor readings are outside normal limits?",
        "What should the operator inspect first?",
        "What maintenance action is recommended?",
      ]

    case "healthy":
      return [
        "Summarize this machine's current health.",
        "Are there any early signs of abnormal behaviour?",
        "What maintenance should be planned next?",
        "Explain the recent sensor trends.",
      ]

    default:
      return [
        "Summarize this machine's latest operational evidence.",
        "What evidence indicates maintenance may be required?",
        "What should the operator inspect first?",
        "Explain the latest anomaly assessment.",
      ]
  }
}


export default function OperationsCopilot({
  machine,
}: OperationsCopilotProps) {
  const [question, setQuestion] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [liveStatus, setLiveStatus] = useState<string | null>(null)

  const machineId = machine?.id

  const normalizedMachineStatus = useMemo(() => {
    return normalizeStatus(liveStatus ?? machine?.status ?? "unknown")
  }, [machine?.status, liveStatus])

  const machineStatus = useMemo(() => {
    if (!machine) return "No machine selected"
    return formatStatus(normalizedMachineStatus)
  }, [machine, normalizedMachineStatus])

  const currentSuggestedQuestions = useMemo(
    () => getSuggestedQuestions(normalizedMachineStatus),
    [normalizedMachineStatus],
  )

  useEffect(() => {
    setMessages([])
    setQuestion("")
    setError("")
    setLiveStatus(null)
  }, [machineId])

  useEffect(() => {
    if (machineId == null) {
      setLiveStatus(null)
      return
    }

    let active = true

    const fetchLiveStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/operations/live`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        })
        if (!response.ok) return

        const payload: unknown = await response.json()
        const machines = extractLiveMachines(payload)
        const selectedId = String(machineId)
        const selectedCode = normalizeMachineCode(machine?.machine_code)

        // Match by machine code first, then ID (accepting numeric or string IDs).
        const currentMachine =
          (selectedCode
            ? machines.find((item) => normalizeMachineCode(item.machine_code) === selectedCode)
            : undefined) ??
          machines.find((item) => {
            const candidateId = item.id ?? item.machine_id
            return candidateId != null && String(candidateId) === selectedId
          })

        const statusValue = currentMachine?.status ?? currentMachine?.operational_status
        if (active && typeof statusValue === "string" && statusValue.trim()) {
          setLiveStatus(normalizeStatus(statusValue))
        }
      } catch {
        // Keep the last known status if a refresh fails.
      }
    }

    void fetchLiveStatus()
    const intervalId = window.setInterval(() => {
      void fetchLiveStatus()
    }, 5000)

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [machineId, machine?.machine_code])


  const sendQuestion = async (text?: string) => {
    const finalQuestion = (
      text ?? question
    ).trim()

    if (
      !finalQuestion ||
      !machine ||
      loading
    ) {
      return
    }


    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: finalQuestion,
      timestamp: new Date(),
    }


    setMessages((previous) => [
      ...previous,
      userMessage,
    ])

    setQuestion("")
    setError("")
    setLoading(true)


    try {
      const response = await fetch(
        `${API_BASE_URL}/copilot/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            machine_id: machine.id,
            question: finalQuestion,
          }),
        },
      )


      if (!response.ok) {
        let errorMessage =
          "Copilot request failed."

        try {
          const errorData =
            await response.json()

          if (
            typeof errorData?.detail ===
            "string"
          ) {
            errorMessage =
              errorData.detail
          }
        } catch {
          // Keep default error message.
        }

        throw new Error(errorMessage)
      }


      const data: CopilotResponse =
        await response.json()


      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer,
        timestamp: new Date(),
        evidence: data.evidence,
        snapshot:
          data.evidence_snapshot,
      }


      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ])
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to reach the AI Operations Copilot."

      setError(message)
    } finally {
      setLoading(false)
    }
  }


  if (!machine) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
        <div className="flex items-center gap-3">

          <div className="rounded-xl bg-slate-900 p-3">
            <Bot className="h-5 w-5 text-slate-400" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">
              AI Operations Copilot
            </h2>

            <p className="text-sm text-slate-500">
              Select a machine to start an
              evidence-grounded operational analysis.
            </p>
          </div>

        </div>
      </section>
    )
  }


  return (
    <section className="flex min-h-[720px] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">

      {/* HEADER */}

      <div className="border-b border-slate-800 px-5 py-4">

        <div className="flex items-center justify-between gap-4">

          <div className="flex items-center gap-3">

            <div className="relative rounded-xl bg-slate-900 p-3">

              <Bot className="h-5 w-5 text-cyan-400" />

              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />

            </div>

            <div>

              <div className="flex items-center gap-2">

                <h2 className="text-lg font-semibold text-white">
                  AI Operations Copilot
                </h2>

                <Sparkles className="h-4 w-4 text-cyan-400" />

              </div>

              <p className="text-xs text-slate-500">
                Evidence-grounded manufacturing intelligence
              </p>

            </div>

          </div>


          <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">

            <div className="flex items-center gap-2">

              <Activity className="h-4 w-4 text-cyan-400" />

              <div>

                <p className="text-[10px] uppercase tracking-wider text-slate-500">
                  Active machine
                </p>

                <p className="text-sm font-medium text-white">
                  {machine.machine_code}
                </p>

              </div>

            </div>

          </div>

        </div>


        {/* MACHINE CONTEXT */}

        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">

          <ContextCard
            label="Status"
            value={machineStatus}
            warning={normalizedMachineStatus === "warning" || normalizedMachineStatus === "offline"}
            status={normalizedMachineStatus}
          />

          <ContextCard
            label="Health"
            value={`${machine.health_score}%`}
            warning={
              machine.health_score < 80
            }
          />

          <ContextCard
            label="Temperature"
            value={
              machine.temperature != null
                ? `${machine.temperature.toFixed(1)}°C`
                : "—"
            }
          />

          <ContextCard
            label="Vibration"
            value={
              machine.vibration != null
                ? `${machine.vibration.toFixed(2)} mm/s`
                : "—"
            }
          />

        </div>

      </div>


      {/* CHAT AREA */}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">

        {messages.length === 0 ? (

          <div className="flex h-full min-h-[450px] flex-col items-center justify-center">

            <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <Bot className="h-8 w-8 text-cyan-400" />
            </div>

            <h3 className="text-base font-semibold text-white">
              How can I help with {machine.machine_code}?
            </h3>

            <p className="mt-2 max-w-md text-center text-sm text-slate-500">
              Ask about machine health, abnormal telemetry,
              anomaly evidence, or maintenance recommendations.
            </p>


            <div className="mt-6 grid w-full max-w-2xl gap-2 md:grid-cols-2">

              {currentSuggestedQuestions.map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() =>
                      sendQuestion(item)
                    }
                    className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-left text-sm text-slate-300 transition hover:border-cyan-500/40 hover:bg-slate-900 hover:text-white"
                  >
                    {item}
                  </button>
                ),
              )}

            </div>

          </div>

        ) : (

          <div className="space-y-6">

            {messages.map((message) => (

              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "flex justify-end"
                    : "flex justify-start"
                }
              >

                <div
                  className={
                    message.role === "user"
                      ? "max-w-[85%]"
                      : "w-full max-w-[95%]"
                  }
                >

                  {/* MESSAGE LABEL */}

                  <div className="mb-1 flex items-center gap-2">

                    {message.role ===
                    "assistant" ? (
                      <Bot className="h-3.5 w-3.5 text-cyan-400" />
                    ) : (
                      <User className="h-3.5 w-3.5 text-slate-500" />
                    )}

                    <span className="text-[11px] text-slate-500">
                      {message.role ===
                      "assistant"
                        ? "ForgeTwin Copilot"
                        : "Operator"}
                    </span>

                  </div>


                  {/* MESSAGE */}

                  <div
                    className={
                      message.role ===
                      "user"
                        ? "rounded-2xl rounded-tr-md bg-cyan-500 px-4 py-3 text-sm leading-6 text-slate-950"
                        : "rounded-2xl rounded-tl-md border border-slate-800 bg-slate-900 px-4 py-4 text-sm leading-6 text-slate-200"
                    }
                  >

                    <div className="whitespace-pre-wrap">
                      {message.content}
                    </div>

                  </div>


                  {/* EVIDENCE */}

                  {message.role ===
                    "assistant" &&
                    message.evidence &&
                    message.snapshot && (

                      <EvidencePanel
                        evidence={
                          message.evidence
                        }
                        snapshot={
                          message.snapshot
                        }
                      />

                    )}


                  <div className="mt-1 text-[10px] text-slate-600">
                    {formatTime(
                      message.timestamp,
                    )}
                  </div>

                </div>

              </div>

            ))}


            {/* LOADING */}

            {loading && (

              <div className="flex justify-start">

                <div className="rounded-2xl rounded-tl-md border border-slate-800 bg-slate-900 px-4 py-3">

                  <div className="flex items-center gap-2 text-sm text-slate-400">

                    <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />

                    Analyzing current plant evidence...

                  </div>

                </div>

              </div>

            )}

          </div>

        )}

      </div>


      {/* ERROR */}

      {error && (

        <div className="mx-5 mb-3 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3">

          <div className="flex items-start gap-2">

            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />

            <div>

              <p className="text-xs font-medium text-red-300">
                Copilot request failed
              </p>

              <p className="mt-1 text-xs text-red-400/80">
                {error}
              </p>

            </div>

          </div>

        </div>

      )}


      {/* INPUT */}

      <div className="border-t border-slate-800 p-4">

        <div className="flex items-end gap-2 rounded-xl border border-slate-700 bg-slate-900 p-2 focus-within:border-cyan-500/50">

          <textarea
            value={question}
            onChange={(event) =>
              setQuestion(
                event.target.value,
              )
            }
            onKeyDown={(event) => {

              if (
                event.key === "Enter" &&
                !event.shiftKey
              ) {
                event.preventDefault()
                sendQuestion()
              }

            }}
            placeholder={`Ask about ${machine.machine_code}...`}
            rows={2}
            disabled={loading}
            className="min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          />


          <button
            type="button"
            onClick={() =>
              sendQuestion()
            }
            disabled={
              !question.trim() ||
              loading
            }
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500 text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
          >

            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}

          </button>

        </div>


        <div className="mt-2 flex items-center justify-between px-1">

          <p className="text-[10px] text-slate-600">
            Enter to send · Shift + Enter for a new line
          </p>

          <p className="text-[10px] text-slate-600">
            AI-assisted · Operator decides
          </p>

        </div>

      </div>

    </section>
  )
}


/* =========================================================
   EVIDENCE PANEL
========================================================= */

function EvidencePanel({
  evidence,
  snapshot,
}: {
  evidence: CopilotEvidence
  snapshot: EvidenceSnapshot
}) {
  const telemetry = evidence.telemetry
  const health = evidence.health
  const anomaly = evidence.anomaly
  const maintenance = evidence.maintenance

  const criticalIncidentCount =
    evidence.active_incidents.filter(
      (incident) =>
        incident.severity ===
        "critical",
    ).length


  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-cyan-500/10 bg-slate-950">

      {/* EVIDENCE HEADER */}

      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/70 px-4 py-3">

        <div className="flex items-center gap-2">

          <CheckCircle2 className="h-4 w-4 text-emerald-400" />

          <div>

            <p className="text-xs font-semibold text-slate-200">
              Operational Evidence
            </p>

            <p className="text-[10px] text-slate-600">
              Snapshot used by the Copilot
            </p>

          </div>

        </div>


        <div className="flex items-center gap-1 text-[10px] text-slate-500">

          <Clock3 className="h-3 w-3" />

          {formatTimestamp(
            snapshot.recorded_at,
          )}

        </div>

      </div>


      <div className="p-4">

        {/* TELEMETRY */}

        <div>

          <div className="mb-3 flex items-center justify-between">

            <div>

              <p className="text-[10px] uppercase tracking-wider text-slate-600">
                Sensor telemetry
              </p>

              <p className="mt-0.5 text-xs text-slate-500">
                Telemetry #{telemetry.id}
              </p>

            </div>

            <span className="rounded-full bg-slate-900 px-2 py-1 text-[9px] text-slate-500">
              Live snapshot
            </span>

          </div>


          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">

            <EvidenceMetric
              label="Temperature"
              value={`${telemetry.temperature.toFixed(1)} °C`}
              warning={
                health.temperature_status !==
                "normal"
              }
            />

            <EvidenceMetric
              label="Vibration"
              value={`${telemetry.vibration.toFixed(2)} mm/s`}
              warning={
                health.vibration_status !==
                "normal"
              }
            />

            <EvidenceMetric
              label="Power"
              value={`${telemetry.power_consumption.toFixed(2)} kW`}
              warning={
                health.power_status !==
                "normal"
              }
            />

            <EvidenceMetric
              label="RPM"
              value={`${telemetry.rpm.toFixed(0)} RPM`}
              warning={
                health.rpm_status !==
                "normal"
              }
            />

          </div>

        </div>


        {/* HEALTH / ANOMALY / MAINTENANCE */}

        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">

          {/* HEALTH */}

          <EvidenceStatusCard
            label="Machine Health"
            value={`${health.health_score} / 100`}
            status={health.status}
            warning={
              health.status !==
              "healthy"
            }
          />


          {/* ANOMALY */}

          <EvidenceStatusCard
            label="Anomaly Detection"
            value={
              anomaly.anomaly_score !==
              null
                ? `${anomaly.anomaly_score.toFixed(1)}`
                : "N/A"
            }
            status={
              anomaly.is_anomaly
                ? anomaly.risk_level
                : "normal"
            }
            warning={
              anomaly.is_anomaly
            }
          />


          {/* MAINTENANCE */}

          <EvidenceStatusCard
            label="Maintenance Priority"
            value={
              maintenance.maintenance_priority
            }
            status={
              maintenance.maintenance_priority
            }
            warning={
              maintenance.maintenance_priority !==
              "low"
            }
          />

        </div>


        {/* MAINTENANCE RECOMMENDATION */}

        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-3">

          <p className="text-[10px] uppercase tracking-wider text-slate-600">
            Maintenance assessment
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-300">
            {maintenance.recommended_action}
          </p>

        </div>


        {/* MODEL EVIDENCE */}

        {maintenance.evidence &&
          maintenance.evidence.length >
            0 && (

            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3">

              <p className="text-[10px] uppercase tracking-wider text-slate-600">
                Evidence indicators
              </p>

              <div className="mt-2 space-y-2">

                {maintenance.evidence.map(
                  (item, index) => (

                    <div
                      key={`${item}-${index}`}
                      className="flex items-start gap-2"
                    >

                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />

                      <p className="text-xs leading-5 text-slate-400">
                        {item}
                      </p>

                    </div>

                  ),
                )}

              </div>

            </div>

          )}


        {/* TRENDS */}

        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">

          <TrendBadge
            label="Temperature trend"
            value={
              maintenance.temperature_trend ??
              "N/A"
            }
          />

          <TrendBadge
            label="Vibration trend"
            value={
              maintenance.vibration_trend ??
              "N/A"
            }
          />

          <TrendBadge
            label="Power trend"
            value={
              maintenance.power_trend ??
              "N/A"
            }
          />

          <TrendBadge
            label="RPM trend"
            value={
              maintenance.rpm_trend ??
              "N/A"
            }
          />

        </div>


        {/* INCIDENTS */}

        <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">

          <div>

            <p className="text-[10px] uppercase tracking-wider text-slate-600">
              Active incidents
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {evidence.active_incidents.length}{" "}
              open incident
              {evidence.active_incidents.length ===
              1
                ? ""
                : "s"}
            </p>

          </div>


          {criticalIncidentCount >
            0 && (

            <span className="rounded-full bg-red-500/10 px-2 py-1 text-[9px] font-medium text-red-400">
              {criticalIncidentCount} critical
            </span>

          )}

        </div>


        {/* DATA SOURCE */}

        <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-3">

          <span className="text-[9px] text-slate-600">
            ForgeTwin operational data
          </span>

          <span className="text-[9px] text-slate-600">
            Telemetry #{snapshot.telemetry_id}
          </span>

        </div>

      </div>

    </div>
  )
}


/* =========================================================
   CONTEXT CARD
========================================================= */

function ContextCard({
  label,
  value,
  warning = false,
  status,
}: {
  label: string
  value: string
  warning?: boolean
  status?: string
}) {
  const valueClass = status === "critical"
    ? "mt-1 text-sm font-semibold text-red-400"
    : status === "warning" || status === "offline" || warning
      ? "mt-1 text-sm font-semibold text-amber-400"
      : "mt-1 text-sm font-semibold text-slate-200"

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-600">{label}</p>
      <p className={valueClass}>{value}</p>
    </div>
  )
}

/* =========================================================
   EVIDENCE METRIC
========================================================= */

function EvidenceMetric({
  label,
  value,
  warning = false,
}: {
  label: string
  value: string
  warning?: boolean
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">

      <p className="text-[9px] uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p
        className={
          warning
            ? "mt-1 text-sm font-semibold text-amber-400"
            : "mt-1 text-sm font-semibold text-slate-200"
        }
      >
        {value}
      </p>

    </div>
  )
}


/* =========================================================
   EVIDENCE STATUS CARD
========================================================= */

function EvidenceStatusCard({
  label,
  value,
  status,
  warning = false,
}: {
  label: string
  value: string
  status: string
  warning?: boolean
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">

      <p className="text-[9px] uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <div className="mt-2 flex items-center justify-between gap-2">

        <span className="text-sm font-semibold text-slate-200">
          {value}
        </span>

        <span
          className={
            warning
              ? "rounded-full bg-amber-500/10 px-2 py-1 text-[9px] font-medium uppercase text-amber-400"
              : "rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-medium uppercase text-emerald-400"
          }
        >
          {status}
        </span>

      </div>

    </div>
  )
}


/* =========================================================
   TREND BADGE
========================================================= */

function TrendBadge({
  label,
  value,
}: {
  label: string
  value: string
}) {
  const normalized =
    value.toLowerCase()

  const warning =
    normalized.includes("increas") ||
    normalized.includes("rising") ||
    normalized.includes("degrad")

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/30 px-3 py-2">

      <p className="text-[9px] text-slate-600">
        {label}
      </p>

      <p
        className={
          warning
            ? "mt-1 text-[10px] font-medium capitalize text-amber-400"
            : "mt-1 text-[10px] font-medium capitalize text-slate-400"
        }
      >
        {value}
      </p>

    </div>
  )
}


/* =========================================================
   HELPERS
========================================================= */

type LiveMachineRecord = {
  id?: number | string
  machine_id?: number | string
  machine_code?: string
  status?: string
  operational_status?: string
}

function extractLiveMachines(payload: unknown): LiveMachineRecord[] {
  if (!payload || typeof payload !== "object") return []
  const root = payload as Record<string, unknown>
  const nestedData = root.data && typeof root.data === "object"
    ? root.data as Record<string, unknown>
    : undefined
  const nestedOperations = root.operations && typeof root.operations === "object"
    ? root.operations as Record<string, unknown>
    : undefined
  const candidates = [root.machines, nestedData?.machines, nestedOperations?.machines]
  const found = candidates.find(Array.isArray)
  return Array.isArray(found) ? found as LiveMachineRecord[] : []
}

function normalizeMachineCode(value?: string | null): string {
  return typeof value === "string" ? value.trim().toUpperCase() : ""
}

function normalizeStatus(value: string): string {
  const status = value.trim().toLowerCase().replace(/[\s-]+/g, "_")
  if (["critical", "critical_condition", "danger"].includes(status)) return "critical"
  if (["warning", "degraded", "attention_required"].includes(status)) return "warning"
  if (["healthy", "normal", "operational", "online", "running"].includes(status)) return "healthy"
  if (["offline", "disconnected", "not_reporting"].includes(status)) return "offline"
  return status || "unknown"
}

function formatStatus(status: string): string {
  if (status === "healthy") return "Online"
  if (status === "critical") return "Critical"
  if (status === "warning") return "Warning"
  if (status === "offline") return "Offline"
  if (status === "unknown") return "Unknown"
  return status.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatTime(timestamp: Date) {
  return timestamp.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  )
}


function formatTimestamp(
  timestamp: string,
) {
  return new Date(
    timestamp,
  ).toLocaleString([], {
    dateStyle: "short",
    timeStyle: "short",
  })
}