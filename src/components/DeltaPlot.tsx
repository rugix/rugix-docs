import { useEffect, useState, type ReactNode } from "react"

/** Follow the site's theme toggle and the system preference. */
export function useThemeMode(): "light" | "dark" {
  const [mode, setMode] = useState<"light" | "dark">("light")

  useEffect(() => {
    const root = document.documentElement
    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    const compute = () => {
      const explicit = root.getAttribute("data-theme")
      setMode(
        explicit === "light" || explicit === "dark"
          ? explicit
          : mql.matches
            ? "dark"
            : "light",
      )
    }
    compute()
    const observer = new MutationObserver(compute)
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    })
    mql.addEventListener("change", compute)
    return () => {
      observer.disconnect()
      mql.removeEventListener("change", compute)
    }
  }, [])

  return mode
}

/** Give all delta-update graphs the same responsive frame. */
export function PlotShell({ children }: { children: ReactNode }) {
  return (
    <div className="delta-plot prose-reset">
      <div className="delta-plot-canvas">{children}</div>
    </div>
  )
}
