import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

import COMPRESSION_FACTORS, { TOTAL_SIZES } from "./delta-savings-data";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type Cadence = "monthly" | "quarterly" | "biannually" | "annually";
type FactorKey = keyof (typeof COMPRESSION_FACTORS)["bookworm"]["annually"];

interface MethodSpec {
  label: string;
  key: FactorKey;
  color: string;
  /**
   * Stack key. Methods sharing a stack render on top of each other in
   * the bar chart (used to split Deltar into "data" and "index"
   * portions while keeping the totals comparable to the other bars).
   */
  stack?: string;
}

const CADENCES: Cadence[] = ["monthly", "quarterly", "biannually", "annually"];
const CADENCE_LABELS = ["Monthly", "Quarterly", "Biannually", "Annually"];
const ACCUMULATED_LABELS = [
  "Monthly (12 updates)",
  "Quarterly (4 updates)",
  "Biannual (2 updates)",
  "Annual (1 update)",
];

const METHODS: MethodSpec[] = [
  { label: "No delta updates", key: "compression", color: "#f43f5e" },
  {
    label: "Block-Based, Fixed 4 KiB / 32 KiB",
    key: "block-based-fixed-4-768-32768",
    color: "#c084fc",
  },
  {
    label: "Block-Based, Fixed 4 KiB / 64 KiB",
    key: "block-based-fixed-4-768-65536",
    color: "#a855f7",
  },
  {
    label: "Block-Based, Casync 64 KiB",
    key: "block-based-casync-64-768",
    color: "#7dd3fc",
  },
  {
    label: "Block-Based, Casync 16 KiB",
    key: "block-based-casync-16-768",
    color: "#0ea5e9",
  },
  {
    label: "File-Based, Deltar 16 KiB (data)",
    key: "deltar-casync-16-768-32768-data",
    color: "#84cc16",
    stack: "deltar-casync-16-768-32768",
  },
  {
    label: "File-Based, Deltar 16 KiB (index)",
    key: "deltar-casync-16-768-32768-plan",
    color: "#d9f99d",
    stack: "deltar-casync-16-768-32768",
  },
  { label: "Xdelta", key: "xdelta", color: "#10b981" },
];

/**
 * Hook returning the current effective theme — `"light"` or `"dark"`.
 * Reads the `data-theme` attribute set by the theme toggle, falling
 * back to `prefers-color-scheme` when no explicit preference is set.
 *
 * Re-runs on attribute changes (when the user toggles the theme) and
 * media-query changes (when the OS setting flips).
 */
function useThemeMode(): "light" | "dark" {
  const [mode, setMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = document.documentElement;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");

    const compute = () => {
      const explicit = root.getAttribute("data-theme");
      if (explicit === "light" || explicit === "dark") {
        setMode(explicit);
        return;
      }
      setMode(mql.matches ? "dark" : "light");
    };

    compute();
    const observer = new MutationObserver(compute);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    mql.addEventListener("change", compute);
    return () => {
      observer.disconnect();
      mql.removeEventListener("change", compute);
    };
  }, []);

  return mode;
}

function plotOptions(title: string, mode: "light" | "dark") {
  const tickColor = mode === "dark" ? "#e5e7eb" : "#1f2937";
  const gridColor = mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  return {
    plugins: {
      title: { display: true, text: title, color: tickColor },
      legend: { position: "bottom" as const, labels: { color: tickColor } },
    },
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    scales: {
      x: { stacked: true, ticks: { color: tickColor }, grid: { color: gridColor } },
      y: { stacked: true, ticks: { color: tickColor }, grid: { color: gridColor } },
    },
  };
}

interface PlotShellProps {
  children: React.ReactNode;
}

function PlotShell({ children }: PlotShellProps) {
  return (
    <div className="delta-plot prose-reset">
      <div className="delta-plot-canvas">{children}</div>
    </div>
  );
}

/**
 * Minor-update efficiency ratios across the four cadences. Each method
 * is divided by the LZMA-only baseline at the same cadence, so 1.0 is
 * "no improvement over plain compression."
 */
export function PlotRollingUpdates() {
  const mode = useThemeMode();
  const data = {
    labels: CADENCE_LABELS,
    datasets: METHODS.map((method) => ({
      label: method.label,
      backgroundColor: method.color,
      stack: method.stack ?? method.key,
      data: CADENCES.map((cadence) => {
        const bw =
          COMPRESSION_FACTORS.bookworm[cadence][method.key] /
          COMPRESSION_FACTORS.bookworm[cadence].compression;
        const bs =
          COMPRESSION_FACTORS.bullseye[cadence][method.key] /
          COMPRESSION_FACTORS.bullseye[cadence].compression;
        return (bw + bs) / 2;
      }),
    })),
  };
  return (
    <PlotShell>
      <Bar options={plotOptions("Minor Updates: Efficiency Ratios", mode)} data={data} />
    </PlotShell>
  );
}

/**
 * Accumulated GiB/device/year for each cadence × method. Useful for
 * understanding the absolute cost across update frequencies.
 */
export function PlotTotalSizes() {
  const mode = useThemeMode();
  const data = {
    labels: ACCUMULATED_LABELS,
    datasets: METHODS.map((method) => ({
      label: method.label,
      backgroundColor: method.color,
      stack: method.stack ?? method.key,
      data: CADENCES.map((cadence) => {
        const bw = TOTAL_SIZES.bookworm[cadence][method.key];
        const bs = TOTAL_SIZES.bullseye[cadence][method.key];
        return (bw + bs) / 2 / 2 / 1024 / 1024 / 1024;
      }),
    })),
  };
  return (
    <PlotShell>
      <Bar
        options={plotOptions("Minor Updates: Accumulated GiB / Year", mode)}
        data={data}
      />
    </PlotShell>
  );
}

/**
 * Major-upgrade efficiency ratios (Bullseye → Bookworm) at each
 * cadence. Most ratios end up above 1.0 here — delta techniques can
 * cost more than plain LZMA when the changes are large enough.
 */
export function PlotMajorUpdates() {
  const mode = useThemeMode();
  const data = {
    labels: CADENCE_LABELS,
    datasets: METHODS.map((method) => ({
      label: method.label,
      backgroundColor: method.color,
      stack: method.stack ?? method.key,
      data: CADENCES.map(
        (cadence) =>
          COMPRESSION_FACTORS["bullseye-bookworm"][cadence][method.key] /
          COMPRESSION_FACTORS["bullseye-bookworm"][cadence].compression,
      ),
    })),
  };
  return (
    <PlotShell>
      <Bar options={plotOptions("Major Upgrades: Efficiency Ratios", mode)} data={data} />
    </PlotShell>
  );
}
