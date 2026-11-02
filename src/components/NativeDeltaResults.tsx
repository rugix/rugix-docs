import { useId, useState } from "react"
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Legend,
  Title,
  Tooltip,
  type ChartOptions,
} from "chart.js"
import { Bar } from "react-chartjs-2"

import { PlotShell, useThemeMode } from "./DeltaPlot"
import BENCHMARK from "./native-delta-data.json"

ChartJS.register(BarElement, CategoryScale, LinearScale, Legend, Title, Tooltip)

const WORKLOADS = [
  { id: "monthly", label: "Monthly Update" },
  { id: "annual", label: "Annual Update" },
  { id: "major", label: "Major Upgrade" },
] as const
type Workload = (typeof WORKLOADS)[number]["id"]

const INSTALLERS = [
  {
    id: "rugix-release",
    label: "Rugix Ctrl 1.3.0",
    color: "#64748b",
  },
  {
    id: "rugix-pipeline",
    label: "Rugix Ctrl 1.4 Fetcher",
    color: "#0ea5e9",
  },
  { id: "rauc-http", label: "RAUC 1.15.2", color: "#c084fc" },
]
const RTTS = [0, 10, 40]
const MIB = 1024 ** 2

function group(workload: Workload, candidate: string, rtt: number) {
  const row = BENCHMARK.groups.find(
    (row) =>
      row.workload === workload &&
      row.candidate === candidate &&
      row.rtt_ms === rtt,
  )
  if (!row) throw new Error("Missing native delta benchmark group")
  return row
}

function colors(mode: "light" | "dark") {
  return {
    text: mode === "dark" ? "#e5e7eb" : "#1f2937",
    grid: mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
  }
}

/** Median installation times across the tested network latencies. */
export function InstallationTimesTable() {
  const [workload, setWorkload] = useState<Workload>("monthly")
  const controlId = useId()
  const groups = INSTALLERS.map((installer) =>
    RTTS.map((rtt) => group(workload, installer.id, rtt)),
  )
  return (
    <div className="native-delta-results prose-reset">
      <label className="native-delta-controls" htmlFor={controlId}>
        Update scenario
        <select
          id={controlId}
          className="delta-savings-select"
          value={workload}
          onChange={(event) =>
            setWorkload(event.currentTarget.value as Workload)
          }
        >
          {WORKLOADS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <div className="native-delta-values">
        <table className="native-delta-table">
          <caption>Median installation time (seconds)</caption>
          <thead>
            <tr>
              <th scope="col">Installer</th>
              {RTTS.map((rtt) => (
                <th key={rtt} scope="col">
                  {rtt} ms
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INSTALLERS.map((installer, index) => (
              <tr
                key={installer.id}
                data-featured={installer.id === "rugix-pipeline"}
              >
                <th scope="row">{installer.label}</th>
                {groups[index].map((row) => (
                  <td key={row.rtt_ms}>{row.seconds_median.toFixed(1)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="native-delta-caption">
        Five installs per condition. Columns show added round-trip latency.
      </p>
    </div>
  )
}

/** Measured interface traffic, including requests and acknowledgments. */
export function PlotDownloadSizes() {
  const palette = colors(useThemeMode())
  const data = {
    labels: WORKLOADS.map((item) => item.label),
    datasets: INSTALLERS.map((installer) => ({
      label: installer.label,
      backgroundColor: installer.color,
      data: WORKLOADS.map(
        (workload) =>
          group(workload.id, installer.id, 10).total_bytes_median / MIB,
      ),
    })),
  }
  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      title: {
        display: true,
        text: "Measured Network Traffic",
        color: palette.text,
      },
      legend: { position: "bottom", labels: { color: palette.text } },
      tooltip: {
        callbacks: {
          label: (item) =>
            `${item.dataset.label}: ${item.parsed.y?.toFixed(2)} MiB`,
        },
      },
    },
    scales: {
      x: { ticks: { color: palette.text }, grid: { display: false } },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Traffic in Both Directions (MiB)",
          color: palette.text,
        },
        ticks: { color: palette.text },
        grid: { color: palette.grid },
      },
    },
  }
  return (
    <div className="native-delta-plot prose-reset">
      <PlotShell>
        <Bar
          data={data}
          options={options}
          aria-label="Network traffic in both directions, median of five installs at 10 ms RTT"
        />
      </PlotShell>
      <p className="native-delta-caption">
        Medians from five installs per scenario at 10 ms added RTT. Includes
        traffic in both directions and network framing.
      </p>
    </div>
  )
}
