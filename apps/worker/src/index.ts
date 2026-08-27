import type { Ad } from "@career-architect/shared";

// Placeholder entrypoint for the scheduled monitoring/scraping worker cycle.
// Real pipeline stages (ATS connectors, career-page detection, scraping, ad-lifecycle
// tracking) land in later passes — see docs/career-engineer-project-state-*.md, Job sourcing.
function runCycle(): void {
  const exampleAdShape: Pick<Ad, "dedupKey" | "company"> = {
    dedupKey: "stub",
    company: "stub",
  };
  console.log("worker cycle stub", exampleAdShape);
}

runCycle();
