import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import { launch } from 'chrome-launcher'
import lighthouse from 'lighthouse'

const base = process.env.LIGHTHOUSE_URL ?? 'http://localhost:4173'
const runs = Number(process.env.LIGHTHOUSE_RUNS ?? 3)
const outDir = 'lighthouse'
const pages = [
  { name: 'home', path: '/' },
  { name: 'detalhe', path: '/nft/nft_12' },
]
const profiles = {
  mobile: undefined,
  desktop: {
    formFactor: 'desktop',
    screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
    throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 },
  },
}
const targets = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 }

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]

await mkdir(outDir, { recursive: true })
const chrome = await launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox'] })
const summary = []
let version = ''

try {
  for (const [profile, settings] of Object.entries(profiles)) {
    for (const page of pages) {
      const runsResult = []
      for (let run = 1; run <= runs; run += 1) {
        const config = settings ? { extends: 'lighthouse:default', settings } : undefined
        const result = await lighthouse(
          base + page.path,
          { port: chrome.port, output: ['json', 'html'], logLevel: 'error', disableStorageReset: false },
          config,
        )
        version = result.lhr.lighthouseVersion
        const scores = Object.fromEntries(Object.entries(result.lhr.categories).map(([id, category]) => [id, Math.round(category.score * 100)]))
        runsResult.push({ run, scores, lcp: result.lhr.audits['largest-contentful-paint'].numericValue, tbt: result.lhr.audits['total-blocking-time'].numericValue, cls: result.lhr.audits['cumulative-layout-shift'].numericValue })
        const prefix = `${outDir}/${page.name}-${profile}-${run}`
        await writeFile(`${prefix}.report.json`, result.report[0])
        await writeFile(`${prefix}.report.html`, result.report[1])
      }
      const medians = Object.fromEntries(Object.keys(targets).map((id) => [id, median(runsResult.map((entry) => entry.scores[id]))]))
      summary.push({ page: page.name, profile, runs: runsResult, medians, passed: Object.entries(targets).every(([id, goal]) => medians[id] >= goal) })
      console.log(page.name, profile, JSON.stringify(medians))
    }
  }
} finally {
  await chrome.kill()
}

await writeFile(`${outDir}/summary.json`, JSON.stringify({ lighthouse: version, chromium: chromium.name(), base, runs, targets, summary }, null, 2))
