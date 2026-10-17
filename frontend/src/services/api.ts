const API_BASE_URL = "http://127.0.0.1:8001"

export interface Machine {
  id: number
  machine_code: string
  name: string
  machine_type: string
  location: string
  status: string
  temperature: number | null
  vibration: number | null
  power_consumption: number | null
  rpm: number | null
  health_score: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DashboardData {
  total_machines: number
  online_machines: number
  healthy_machines: number
  warning_machines: number
  critical_machines: number
  offline_machines: number
  machines: Machine[]
}

export interface Incident {
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

export interface TelemetryReading {
  id: number
  machine_id: number
  temperature: number
  vibration: number
  power_consumption: number
  rpm: number
  recorded_at: string
}

export interface MachineHealth {
  machine_id: number
  health_score: number
  status: string
  temperature_status: string
  vibration_status: string
  power_status: string
  rpm_status: string
}

export interface AnomalyAnalysis {
  machine_id: number
  telemetry_id: number
  recorded_at: string
  temperature: number
  vibration: number
  power_consumption: number
  rpm: number
  is_anomaly: boolean
  anomaly_score: number
  risk_level: string
  training_records: number
}

export interface MaintenanceAssessment {
  machine_id: number
  machine_code: string
  machine_name: string
  status: string

  health_score: number
  anomaly_score: number
  risk_level: string

  temperature: number
  vibration: number
  power_consumption: number
  rpm: number

  temperature_trend: string
  vibration_trend: string
  power_trend: string
  rpm_trend: string

  maintenance_priority: string
  recommended_action: string

  evidence: string[]

  assessed_at: string
}

/* =========================================================
   LIVE OPERATIONS
========================================================= */

export interface LiveOperationsMachine {
  id: number
  machine_code: string
  name: string
  machine_type: string
  location: string
  status: string
  health_score: number
  temperature: number
  vibration: number
  power_consumption: number
  rpm: number
  last_updated: string
}

export interface LiveOperationsPlant {
  machines_total: number
  machines_online: number
  machines_offline: number
  healthy: number
  warning: number
  critical: number
  active_incidents: number
  total_power_kw: number
}

export interface LiveOperationsData {
  timestamp: string
  plant: LiveOperationsPlant
  machines: LiveOperationsMachine[]
}

/* =========================================================
   DASHBOARD
========================================================= */

export async function getDashboard(): Promise<DashboardData> {
  const response = await fetch(
    `${API_BASE_URL}/machines/dashboard`
  )

  if (!response.ok) {
    throw new Error(
      `Dashboard API failed: ${response.status}`
    )
  }

  return response.json()
}

/* =========================================================
   INCIDENTS
========================================================= */

export async function getActiveIncidents(): Promise<Incident[]> {
  const response = await fetch(
    `${API_BASE_URL}/incidents/active`
  )

  if (!response.ok) {
    throw new Error(
      `Incidents API failed: ${response.status}`
    )
  }

  return response.json()
}

/* =========================================================
   TELEMETRY
========================================================= */

export async function getMachineTelemetry(
  machineId: number
): Promise<TelemetryReading[]> {
  const response = await fetch(
    `${API_BASE_URL}/telemetry/${machineId}`
  )

  if (!response.ok) {
    throw new Error(
      `Telemetry API failed: ${response.status}`
    )
  }

  return response.json()
}

/* =========================================================
   MACHINE HEALTH
========================================================= */

export async function getMachineHealth(
  machineId: number
): Promise<MachineHealth> {
  const response = await fetch(
    `${API_BASE_URL}/telemetry/${machineId}/health`
  )

  if (!response.ok) {
    throw new Error(
      `Machine health API failed: ${response.status}`
    )
  }

  return response.json()
}

/* =========================================================
   ANOMALY DETECTION
========================================================= */

export async function getMachineAnomaly(
  machineId: number
): Promise<AnomalyAnalysis> {
  const response = await fetch(
    `${API_BASE_URL}/telemetry/${machineId}/anomaly`
  )

  if (!response.ok) {
    throw new Error(
      `Anomaly API failed: ${response.status}`
    )
  }

  return response.json()
}

/* =========================================================
   PREDICTIVE MAINTENANCE
========================================================= */

export async function getMachineMaintenance(
  machineId: number
): Promise<MaintenanceAssessment> {
  const response = await fetch(
    `${API_BASE_URL}/machines/${machineId}/maintenance`
  )

  if (!response.ok) {
    throw new Error(
      `Maintenance API failed: ${response.status}`
    )
  }

  return response.json()
}

/* =========================================================
   LIVE OPERATIONS API
========================================================= */

export async function getLiveOperations(): Promise<LiveOperationsData> {
  const response = await fetch(
    `${API_BASE_URL}/operations/live`
  )

  if (!response.ok) {
    throw new Error(
      `Live Operations API failed: ${response.status}`
    )
  }

  return response.json()
}