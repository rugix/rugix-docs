---

---

# SBOM Generation

Rugix Bakery will, by default, generate both an [SPDX](https://spdx.dev/) and a [CycloneDX](https://cyclonedx.org/) SBOM for your system using information from the package manager.
The SBOMs are placed in the system output directory and are named `sbom.spdx.json` and `sbom.cdx.json`, respectively.
An SBOM is a crucial centerpiece of a robust strategy to identify vulnerabilities in a product.
You can use off-the-shelf vulnerability scanner and monitoring tools, such as [Grype](https://github.com/anchore/grype), to analyze the SBOMs of your system for vulnerabilities and then ship timely updates to all affected devices.

If you are developing connected products for the European marked, the Cyber Resilience Act (CRA) requires you to create an SBOM for your product such that you are able to identify, patch, and disclose any security vulnerabilities in a timely manner.