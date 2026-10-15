import { useId, useState } from "react"
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Legend,
  Title,
  Tooltip,
  type ChartOptions,
} from "chart.js"
import { Bar, Line } from "react-chartjs-2"

import { PlotShell, useThemeMode } from "./DeltaPlot"
import BENCHMARK from "./native-delta-data.json"

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Legend,
  Title,
  Tooltip,
)

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
    dash: [5, 4],
  },
  {
    id: "rugix-pipeline",
    label: "Rugix 1.4 Fetcher",
    color: "#0ea5e9",
    dash: [],
  },
  { id: "rauc-http", label: "RAUC 1.15.2", color: "#c084fc", dash: [2, 3] },
]
const DOWNLOAD_INSTALLERS = INSTALLERS.slice(1)
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

function timeCell(row: ReturnType<typeof group>) {
  return `${row.seconds_median.toFixed(1)} [${row.seconds_q1.toFixed(1)}, ${row.seconds_q3.toFixed(1)}]`
}

/** Native installation medians and every individual run, including slow runs. */
export function PlotInstallationTimes() {
  const [workload, setWorkload] = useState<Workload>("monthly")
  const controlId = useId()
  const mode = useThemeMode()
  const palette = colors(mode)
  const installers = INSTALLERS
  const title = "Installation Time"
  const groups = installers.map((installer) =>
    RTTS.map((rtt) => group(workload, installer.id, rtt)),
  )
  const data = {
    datasets: [
      ...installers.map((installer, index) => ({
        label: installer.label,
        borderColor: installer.color,
        backgroundColor: installer.color,
        borderDash: installer.dash,
        borderWidth: 2,
        pointRadius: 4,
        showLine: true,
        data: groups[index].map((row) => ({
          x: row.rtt_ms,
          y: row.seconds_median,
        })),
      })),
      ...installers.map((installer, index) => ({
        label: `${installer.label}: individual installs`,
        backgroundColor: installer.color + "55",
        pointRadius: 3,
        pointHoverRadius: 0,
        showLine: false,
        data: groups[index].flatMap((row) =>
          row.seconds_samples.map((seconds) => ({ x: row.rtt_ms, y: seconds })),
        ),
      })),
    ],
  }
  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "nearest", axis: "x", intersect: false },
    plugins: {
      title: { display: true, text: title, color: palette.text },
      legend: {
        position: "bottom",
        onClick: (_event, item, legend) => {
          const index = item.datasetIndex!
          const visible = legend.chart.isDatasetVisible(index)
          legend.chart.setDatasetVisibility(index, !visible)
          legend.chart.setDatasetVisibility(index + installers.length, !visible)
          legend.chart.update()
        },
        labels: {
          color: palette.text,
          filter: (item) =>
            installers.some((installer) => installer.label === item.text),
        },
      },
      tooltip: {
        filter: (item) => item.datasetIndex < installers.length,
        callbacks: {
          title: (items) => `${items[0].parsed.x} ms added RTT`,
          label: (item) =>
            `${item.dataset.label}: ${item.parsed.y?.toFixed(1)} s median`,
          afterLabel: (item) => {
            const row = groups[item.datasetIndex][item.dataIndex]
            return [
              `IQR: ${row.seconds_q1.toFixed(1)}–${row.seconds_q3.toFixed(1)} s`,
              `Range: ${row.seconds_minimum.toFixed(1)}–${row.seconds_maximum.toFixed(1)} s; n = ${row.repetitions}`,
            ]
          },
        },
      },
    },
    scales: {
      x: {
        type: "linear",
        min: 0,
        max: 40,
        title: {
          display: true,
          text: "Added Round-Trip Latency (ms)",
          color: palette.text,
        },
        ticks: { color: palette.text, stepSize: 10 },
        grid: { color: palette.grid },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Installation Time (s)",
          color: palette.text,
        },
        ticks: { color: palette.text },
        grid: { color: palette.grid },
      },
    },
  }
  return (
    <div className="native-delta-plot prose-reset">
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
      <PlotShell>
        <Line
          data={data}
          options={options}
          aria-label={`${title}, ${workload}, five installs per condition`}
        />
      </PlotShell>
      <p className="native-delta-caption">
        Lines show medians; faint points show all five installs. Hover for
        interquartile ranges and full ranges.
      </p>
      <details className="native-delta-values">
        <summary>Show measured values</summary>
        <table>
          <caption>
            Installation time in seconds: median [interquartile range], full
            range, and all five runs
          </caption>
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
            {installers.map((installer, index) => (
              <tr key={installer.id}>
                <th scope="row">{installer.label}</th>
                {groups[index].map((row) => (
                  <td key={row.rtt_ms}>
                    {timeCell(row)}
                    <span className="native-delta-runs">
                      Range: {row.seconds_minimum.toFixed(1)}–
                      {row.seconds_maximum.toFixed(1)} s
                    </span>
                    <span className="native-delta-runs">
                      Runs:{" "}
                      {row.seconds_samples
                        .map((value) => value.toFixed(1))
                        .join(", ")}{" "}
                      s
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}

/** Compare measured interface traffic, including requests and acknowledgments. */
export function PlotDownloadSizes() {
  const palette = colors(useThemeMode())
  const data = {
    labels: WORKLOADS.map((item) => item.label),
    datasets: DOWNLOAD_INSTALLERS.map((installer) => ({
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
      <details className="native-delta-values">
        <summary>Show measured values</summary>
        <table>
          <caption>Network traffic in both directions, MiB</caption>
          <thead>
            <tr>
              <th scope="col">Update</th>
              {DOWNLOAD_INSTALLERS.map((item) => (
                <th key={item.id} scope="col">
                  {item.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WORKLOADS.map((workload) => (
              <tr key={workload.id}>
                <th scope="row">{workload.label}</th>
                {DOWNLOAD_INSTALLERS.map((installer) => (
                  <td key={installer.id}>
                    {(
                      group(workload.id, installer.id, 10).total_bytes_median /
                      MIB
                    ).toFixed(2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
