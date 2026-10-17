import { Canvas } from "@react-three/fiber"
import type { ThreeEvent } from "@react-three/fiber"
import { Environment, Grid, Html, OrbitControls } from "@react-three/drei"
import type { Machine } from "../../services/api"

// =========================================================

// MACHINE POSITIONS

// =========================================================



const MACHINE_POSITIONS: Record<

  string,

  [number, number, number]

> = {

  "Zone A": [-4, 0, -2],

  "Zone B": [4, 0, -2],

}






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

// MACHINE OBJECT

// =========================================================



function MachineObject({

  machine,

  selected,

  onSelect,

}: {

  machine: Machine

  selected: boolean

  onSelect: () => void

}) {

  const position =

    MACHINE_POSITIONS[machine.location] ?? [0, 0, 0]



  const statusColor = getStatusColor(

    machine.status,

  )



  const isOffline =

    machine.status === "offline"



  const handleClick = (

    event: ThreeEvent<MouseEvent>,

  ) => {

    event.stopPropagation()

    onSelect()

  }



  return (

    <group

      position={position}

      onClick={handleClick}

    >



      {/* =================================================

          MACHINE BODY

      ================================================= */}



      <mesh

        position={[0, 1, 0]}

        castShadow

        receiveShadow

      >

        <boxGeometry args={[2.5, 2, 2]} />



        <meshStandardMaterial

          color={

            selected

              ? "#172554"

              : "#0f172a"

          }

          metalness={0.65}

          roughness={0.3}

          emissive={

            selected

              ? "#082f49"

              : "#000000"

          }

          emissiveIntensity={

            selected ? 0.5 : 0

          }

        />

      </mesh>





      {/* =================================================

          MACHINE TOP

      ================================================= */}



      <mesh

        position={[0, 2.15, 0]}

        castShadow

      >

        <boxGeometry

          args={[2, 0.3, 1.7]}

        />



        <meshStandardMaterial

          color="#64748b"

          metalness={0.7}

          roughness={0.25}

        />

      </mesh>





      {/* =================================================

          STATUS LIGHT

      ================================================= */}



      <mesh

        position={[0, 2.45, 0]}

      >

        <sphereGeometry

          args={[0.18, 24, 24]}

        />



        <meshStandardMaterial

          color={statusColor}

          emissive={statusColor}

          emissiveIntensity={

            isOffline ? 0.15 : 1.5

          }

        />

      </mesh>





      {/* =================================================

          MACHINE LABEL

      ================================================= */}



      <Html

        position={[0, 3.1, 0]}

        center

        distanceFactor={9}

      >

        <button

          type="button"

          onClick={(event) => {

            event.stopPropagation()

            onSelect()

          }}

          className={`min-w-[150px] rounded-lg border px-4 py-3 text-center backdrop-blur-md transition ${

            selected

              ? "border-cyan-400 bg-cyan-950/90 shadow-lg shadow-cyan-500/20"

              : "border-white/20 bg-[#0b1220]/95 hover:border-cyan-400/60"

          }`}

        >

          <div className="text-sm font-semibold text-white">

            {machine.machine_code}

          </div>



          <div className="mt-1 text-[10px] text-gray-400">

            {machine.name}

          </div>



          <div

            className="mt-2 text-[10px] font-semibold uppercase"

            style={{

              color: statusColor,

            }}

          >

            {machine.status}

          </div>



          {machine.temperature !== null && (

            <div className="mt-1 text-[10px] text-gray-500">

              {machine.temperature.toFixed(1)}°C

            </div>

          )}

        </button>

      </Html>



    </group>

  )

}







type DigitalTwinSceneProps = {
  machines: Machine[]
  selectedMachineId: number | null
  onSelectMachine: (machineId: number) => void
  onClearSelection: () => void
}

export default function DigitalTwinScene({
  machines,
  selectedMachineId,
  onSelectMachine,
  onClearSelection,
}: DigitalTwinSceneProps) {
  return (
<Canvas

          shadows

          camera={{

            position: [12, 10, 14],

            fov: 45,

          }}

          onPointerMissed={onClearSelection}

        >



          {/* =================================================

              LIGHTING

          ================================================= */}



          <ambientLight

            intensity={0.6}

          />



          <directionalLight

            position={[8, 12, 8]}

            intensity={2}

            castShadow

          />





          {/* =================================================

              ENVIRONMENT

          ================================================= */}



          <Environment

            preset="city"

          />





          {/* =================================================

              FACTORY FLOOR

          ================================================= */}



          <mesh

            rotation={[

              -Math.PI / 2,

              0,

              0,

            ]}

            position={[

              0,

              -0.02,

              0,

            ]}

            receiveShadow

          >



            <planeGeometry

              args={[24, 18]}

            />



            <meshStandardMaterial

              color="#111827"

              metalness={0.2}

              roughness={0.8}

            />



          </mesh>





          {/* =================================================

              FLOOR GRID

          ================================================= */}



          <Grid

            args={[24, 18]}

            position={[

              0,

              0.01,

              0,

            ]}

            cellSize={1}

            cellThickness={0.5}

            cellColor="#334155"

            sectionSize={5}

            sectionThickness={1}

            sectionColor="#475569"

            fadeDistance={30}

            fadeStrength={1}

            infiniteGrid={false}

          />





          {/* =================================================

              MACHINES

          ================================================= */}



          {machines.map(

            (machine) => (

              <MachineObject

                key={machine.id}

                machine={machine}

                selected={

                  machine.id ===

                  selectedMachineId

                }

                onSelect={() => onSelectMachine(machine.id)}

              />

            ),

          )}





          {/* =================================================

              CAMERA CONTROLS

          ================================================= */}



          <OrbitControls

            enableDamping

            dampingFactor={0.08}

            minDistance={7}

            maxDistance={28}

            maxPolarAngle={

              Math.PI / 2.05

            }

          />



      </Canvas>
  )
}
