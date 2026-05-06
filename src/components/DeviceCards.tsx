type DeviceType = "generic" | "specific" | "unknown";
type DeviceTier = "1" | "2" | "3";
type Target = "unknown" | "generic-grub-efi" | "rpi-tryboot" | "rpi-uboot";
type Architecture = "amd64" | "arm64" | "armhf";

interface DeviceInfo {
  name: string;
  type: DeviceType;
  tier: DeviceTier;
  target: Target;
  architectures: Architecture[];
}

const DEVICES: DeviceInfo[] = [
  {
    name: "Generic (Grub, EFI)",
    type: "generic",
    tier: "1",
    target: "generic-grub-efi",
    architectures: ["arm64", "amd64"],
  },
  {
    name: "Raspberry Pi 5",
    type: "specific",
    tier: "1",
    target: "rpi-tryboot",
    architectures: ["arm64", "armhf"],
  },
  {
    name: "Raspberry Pi 4",
    type: "specific",
    tier: "1",
    target: "rpi-tryboot",
    architectures: ["arm64", "armhf"],
  },
  {
    name: "Raspberry Pi CM4",
    type: "specific",
    tier: "2",
    target: "rpi-tryboot",
    architectures: ["arm64", "armhf"],
  },
  {
    name: "Raspberry Pi 3",
    type: "specific",
    tier: "2",
    target: "rpi-uboot",
    architectures: ["arm64", "armhf"],
  },
  {
    name: "Raspberry Pi Zero 2 W",
    type: "specific",
    tier: "2",
    target: "rpi-uboot",
    architectures: ["arm64", "armhf"],
  },
  {
    name: "Raspberry Pi 2 v1.2",
    type: "specific",
    tier: "3",
    target: "rpi-uboot",
    architectures: ["armhf"],
  },
  {
    name: "Raspberry Pi 2",
    type: "specific",
    tier: "3",
    target: "rpi-uboot",
    architectures: ["armhf"],
  },
  {
    name: "Raspberry Pi 1",
    type: "specific",
    tier: "3",
    target: "rpi-uboot",
    architectures: ["armhf"],
  },
  {
    name: "Raspberry Pi Zero",
    type: "specific",
    tier: "3",
    target: "rpi-uboot",
    architectures: ["armhf"],
  },
  {
    name: "Unknown",
    type: "unknown",
    tier: "3",
    target: "unknown",
    architectures: ["arm64", "amd64", "armhf"],
  },
];

const TIER_EMOJIS: Record<DeviceTier, string> = {
  "1": "🥇",
  "2": "🥈",
  "3": "🥉",
};

interface DeviceCardsProps {
  /** Filter — render only devices of this type. */
  type: DeviceType;
}

/**
 * Grid of device cards filtered by tier (Generic / Specific / Unknown).
 * Used in the Bakery "Supported Devices" page. Static data — no
 * client-side state needed, so it can ship without a hydration
 * directive (Astro will render it server-side).
 */
export default function DeviceCards({ type }: DeviceCardsProps) {
  const matching = DEVICES.filter((d) => d.type === type);
  return (
    <div className="device-card-grid prose-reset">
      {matching.map((device) => (
        <DeviceCard key={device.name} info={device} />
      ))}
    </div>
  );
}

function DeviceCard({ info }: { info: DeviceInfo }) {
  return (
    <article className="device-card">
      <h3 className="device-card-heading">
        <span className="device-card-name">{info.name}</span>
        <span
          className="device-card-tier"
          aria-label={`Tier ${info.tier} support`}
          title={`Tier ${info.tier}`}
        >
          {TIER_EMOJIS[info.tier]}
        </span>
      </h3>
      <ul className="device-card-archs" aria-label="Architectures">
        {info.architectures.map((arch) => (
          <li key={arch} className="device-card-arch">
            {arch}
          </li>
        ))}
      </ul>
      <code className="device-card-target">target = "{info.target}"</code>
    </article>
  );
}
