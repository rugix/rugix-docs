import { useMemo, useState } from "react";

import COMPRESSION_FACTORS from "./delta-savings-data";

type Schedule = "monthly" | "quarterly" | "biannually" | "annually";

const SCHEDULES: Array<{ value: Schedule; label: string }> = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "biannually", label: "Biannually" },
  { value: "annually", label: "Annually" },
];

const UPDATES_PER_YEAR: Record<Schedule, number> = {
  monthly: 12,
  quarterly: 4,
  biannually: 2,
  annually: 1,
};

const METHODS: Array<{
  name: string;
  key: keyof (typeof COMPRESSION_FACTORS)["bookworm"]["annually"];
  tools: string;
}> = [
  {
    name: "Block-Based, Fixed 4 KiB / 32 KiB",
    key: "block-based-fixed-4-768-32768",
    tools: "≈ RAUC",
  },
  {
    name: "Block-Based, Casync 16 KiB",
    key: "block-based-casync-16-768",
    tools: "Rugix, Casync",
  },
  {
    name: "File-Based, Deltar 16 KiB",
    key: "deltar-casync-16-768-32768",
    tools: "≈ OSTree, ≈ APT",
  },
  {
    name: "Delta Compression (Xdelta)",
    key: "xdelta",
    tools: "Rugix, Mender, Xdelta",
  },
];

const integerFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const fleetTicks = [1, 5, 10, 50, 100, 500, 1_000, 5_000, 10_000, 50_000, 100_000, 500_000];

/**
 * Cost-savings calculator for delta updates.
 *
 * Estimates the bandwidth bill for a fleet over a year given an update
 * cadence, image size, devices, and per-GiB egress cost — and shows the
 * savings each delta update technique would produce, averaged across
 * Debian Bookworm and Bullseye benchmark scenarios.
 *
 * Designed to ship as an Astro client island: render with
 * `client:visible` so the JS only loads when the user scrolls to it.
 */
export default function DeltaSavingsCalculator() {
  const [schedule, setSchedule] = useState<Schedule>("monthly");
  // Cost per GiB stored as cents to keep range input math integer.
  const [costPerGiBCents, setCostPerGiBCents] = useState<number>(9);
  // Devices stored as the index into `fleetTicks` (a log scale lives
  // better on a slider than a raw 1–500k linear range).
  const [fleetIdx, setFleetIdx] = useState<number>(6);
  // Image size in MiB (range slider).
  const [imageSizeMiB, setImageSizeMiB] = useState<number>(1500);

  const devices = fleetTicks[fleetIdx]!;
  const costPerGiB = costPerGiBCents / 100;

  const baseCost = useMemo(() => {
    const factor =
      (COMPRESSION_FACTORS.bookworm[schedule].compression +
        COMPRESSION_FACTORS.bullseye[schedule].compression) /
      2;
    return (
      (UPDATES_PER_YEAR[schedule] * devices * (imageSizeMiB / 1024)) *
      costPerGiB *
      factor
    );
  }, [schedule, devices, imageSizeMiB, costPerGiB]);

  const rows = useMemo(() => {
    return METHODS.map((method) => {
      const factor =
        (COMPRESSION_FACTORS.bookworm[schedule][method.key] +
          COMPRESSION_FACTORS.bullseye[schedule][method.key]) /
        2;
      const cost =
        (UPDATES_PER_YEAR[schedule] * devices * (imageSizeMiB / 1024)) *
        costPerGiB *
        factor;
      return {
        ...method,
        cost,
        savings: baseCost - cost,
      };
    });
  }, [schedule, devices, imageSizeMiB, costPerGiB, baseCost]);

  return (
    <div className="delta-savings-calculator prose-reset">
      <div className="delta-savings-controls">
        <label className="delta-savings-control">
          <span className="delta-savings-control-label">Update cadence</span>
          <select
            className="delta-savings-select"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value as Schedule)}
          >
            {SCHEDULES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="delta-savings-control">
          <span className="delta-savings-control-label">Cost per GiB</span>
          <div className="delta-savings-slider-row">
            <input
              type="range"
              min={1}
              max={1000}
              step={1}
              value={costPerGiBCents}
              onChange={(e) => setCostPerGiBCents(e.target.valueAsNumber)}
            />
            <span className="delta-savings-readout">
              {(costPerGiBCents / 100).toFixed(2)} USD
            </span>
          </div>
        </label>

        <label className="delta-savings-control">
          <span className="delta-savings-control-label">Devices in fleet</span>
          <div className="delta-savings-slider-row">
            <input
              type="range"
              min={0}
              max={fleetTicks.length - 1}
              step={1}
              value={fleetIdx}
              onChange={(e) => setFleetIdx(e.target.valueAsNumber)}
            />
            <span className="delta-savings-readout">
              {integerFormatter.format(devices)}
            </span>
          </div>
        </label>

        <label className="delta-savings-control">
          <span className="delta-savings-control-label">Image size</span>
          <div className="delta-savings-slider-row">
            <input
              type="range"
              min={10}
              max={15000}
              step={10}
              value={imageSizeMiB}
              onChange={(e) => setImageSizeMiB(e.target.valueAsNumber)}
            />
            <span className="delta-savings-readout">
              {(imageSizeMiB / 1024).toFixed(2)} GiB
            </span>
          </div>
        </label>
      </div>

      <div className="delta-savings-table-wrap">
        <table className="delta-savings-table">
          <thead>
            <tr>
              <th>Method</th>
              <th className="delta-savings-num">Cost / year</th>
              <th className="delta-savings-num">Savings / year</th>
              <th>Tools</th>
            </tr>
          </thead>
          <tbody>
            <tr className="delta-savings-baseline">
              <td>No delta updates</td>
              <td className="delta-savings-num">
                {currencyFormatter.format(baseCost)}
              </td>
              <td className="delta-savings-num">—</td>
              <td></td>
            </tr>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>{row.name}</td>
                <td className="delta-savings-num">
                  {currencyFormatter.format(row.cost)}
                </td>
                <td className="delta-savings-num delta-savings-savings">
                  {currencyFormatter.format(row.savings)}
                </td>
                <td className="delta-savings-tools">{row.tools}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="delta-savings-footnote">
        Estimates are based on averages over two years of monthly Debian
        Bookworm and Bullseye snapshots. Actual savings depend on your
        update content. The default 0.09 USD/GiB matches AWS S3 egress.
      </p>
    </div>
  );
}
