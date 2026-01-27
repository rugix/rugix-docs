import React from "react"
import clsx from "clsx"
import Link from "@docusaurus/Link"
import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import Layout from "@theme/Layout"

import styles from "./index.module.css"

function HomepageHeader() {
  return (
    <header
      className={clsx("hero hero--primary", styles.heroBanner, styles.hero)}
    >
      <div className="mx-auto text-center px-4">
        <h1 className="text-3xl md:text-5xl">
          Ruggedized Linux for Embedded Systems
        </h1>
        <p className="mx-auto max-w-[60ch] text-lg md:text-xl my-6">
          Open-source tools for building and updating industrial Linux devices.
          <br />
          <strong>Deploy updates with confidence. Never brick a device.</strong>
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/getting-started"
          >
            <span className="hidden sm:inline">From Zero to OTA Update in 20 Minutes 🚀</span>
            <span className="sm:hidden">Get Started 🚀</span>
          </Link>
        </div>
      </div>
    </header>
  )
}

function ToolOverview() {
  return (
    <section className="py-16">
      <div className="container">
        <h2 className="text-center text-3xl mb-4">Two Tools. One Goal.</h2>
        <p className="text-center max-w-[60ch] mx-auto mb-10 text-lg opacity-80">
          Rugix provides everything you need to build and maintain robust
          embedded Linux products, from development to production.
        </p>
        <div className="flex flex-wrap justify-center gap-8 px-4">
          <Link
            to="/docs/ctrl"
            className="max-w-md p-6 rounded-xl border border-solid border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-black/5 dark:hover:bg-white/5 transition-colors !no-underline !text-inherit hover:!text-inherit"
          >
            <h3 className="text-xl mb-2">Rugix Ctrl</h3>
            <p className="opacity-80 mb-3">
              <strong>The update and state management engine.</strong>
            </p>
            <p className="text-sm opacity-70 mb-4">
              Atomic A/B updates with automatic rollback, delta updates,
              cryptographic verification, and robust state management. Supports
              any bootloader and integrates with any fleet management solution.
              Works with Yocto, Buildroot, or any Linux build system.
            </p>
            <span className="text-sm font-medium text-[var(--ifm-color-primary)]">
              Learn more →
            </span>
          </Link>
          <Link
            to="/docs/bakery"
            className="max-w-md p-6 rounded-xl border border-solid border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-black/5 dark:hover:bg-white/5 transition-colors !no-underline !text-inherit hover:!text-inherit"
          >
            <h3 className="text-xl mb-2">Rugix Bakery</h3>
            <p className="opacity-80 mb-3">
              <strong>The image build system.</strong>
            </p>
            <p className="text-sm opacity-70 mb-4">
              Build custom Linux distributions based on Debian, Alpine Linux, or
              Raspberry Pi OS. Container-based reproducible builds, multiple
              system variants, integrated testing with VM support, and SBOM
              generation for compliance. OTA updates powered by Rugix Ctrl.
            </p>
            <span className="text-sm font-medium text-[var(--ifm-color-primary)]">
              Learn more →
            </span>
          </Link>
        </div>
        <p className="text-center max-w-[60ch] mx-auto mt-8 opacity-70">
          Use both together for a complete solution, or integrate Rugix Ctrl
          into your existing Yocto or Buildroot workflow.
        </p>
      </div>
    </section>
  )
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext()
  return (
    <Layout title="Home" description={siteConfig.tagline}>
      <HomepageHeader />
      <ToolOverview />
      <main>
        {/* Trusted By */}
        <section className="py-16 bg-black/5 dark:bg-white/5">
          <h2 className="text-center text-3xl mb-8">Trusted By</h2>
          <div className="px-4 flex-wrap gap-y-8 flex items-center justify-center gap-x-12 opacity-85">
            <a href="https://goaqa.com/" target="_blank" className="flex">
              <img
                className="max-h-8"
                src="https://oss.silitics.com/third-party-logos/aqa.png"
                alt="Aqa Technologies, Inc."
              />
            </a>
            <a
              href="https://www.ebike-checker.de/en/"
              target="_blank"
              className="flex"
            >
              <img
                className="max-h-7"
                src="https://oss.silitics.com/third-party-logos/echecker.svg"
                alt="eChecker"
              />
            </a>
            <a href="https://enmo.ai/" target="_blank" className="flex">
              <img
                className="max-h-7"
                src="https://oss.silitics.com/third-party-logos/enmo.webp"
                alt="Enmo"
              />
            </a>
            <a
              href="https://umbrel.com/"
              target="_blank"
              className="flex items-center"
            >
              <img
                className="max-h-7"
                src="https://oss.silitics.com/third-party-logos/umbrel.svg"
                alt="Umbrel, Inc."
              />
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-8 px-4 mt-10">
            <div className="max-w-sm p-6 rounded-xl bg-white/50 dark:bg-black/20 border border-solid border-gray-200 dark:border-gray-700">
              <div className="italic leading-[1.6] mb-4">
                "If you're not using Rugix, you're making things harder than
                they need to be."
              </div>
              <div className="text-sm opacity-80">
                David Lekve, CTO at <a href="https://enmo.ai">enmo</a>
              </div>
            </div>
            <div className="max-w-sm p-6 rounded-xl bg-white/50 dark:bg-black/20 border border-solid border-gray-200 dark:border-gray-700">
              <div className="italic leading-[1.6] mb-4">
                "Rugix is thoughtfully designed, fast to get started with, and
                flexible in all the right ways. It's the tool suite for embedded
                Linux I've always wanted."
              </div>
              <div className="text-sm opacity-80">
                Rameen Aryanpur, CEO at <a href="https://goaqa.com/">Aqa</a>
              </div>
            </div>
          </div>
        </section>

        {/* User Success Story */}
        <section id="user-success-stories" className="py-16">
          <h2 className="text-center text-3xl mb-8">User Success Story</h2>
          <div className="flex items-center justify-center gap-x-8 flex-wrap gap-y-4 px-4">
            <img
              className="h-40"
              src="https://oss.silitics.com/third-party-logos/enmo-battery-brain.webp"
              alt="BatteryBrain device"
            />
            <div className="max-w-[55ch]">
              <h3 className="text-xl mb-2">BatteryBrain</h3>
              <div className="italic leading-[1.6]">
                "At Enmo, we use Rugix for our product, BatteryBrain—a device
                optimizing battery systems based on spot prices, battery health,
                production inputs, and electricity markets. Rugix has been
                essential in bringing BatteryBrain to a production-ready state
                as quickly and efficiently as possible. It has simplified the
                creation of a custom Raspberry Pi image and enabled seamless
                over-the-air (OTA) updates."
              </div>
              <div className="mt-3 opacity-80">
                David Lekve, CTO at <a href="https://enmo.ai">enmo</a>
              </div>
            </div>
          </div>
        </section>

      </main>
    </Layout>
  )
}
