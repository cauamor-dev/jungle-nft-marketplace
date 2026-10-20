import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import { chromium } from '@playwright/test'
import { launch } from 'chrome-launcher'
import lighthouse from 'lighthouse'

const base = process.env.LIGHTHOUSE_URL ?? 'http://localhost:4173'
const runs = Number(process.env.LIGHTHOUSE_RUNS ?? 3)
const chromePath = chromium.executablePath()
const outDir = 'lighthouse'
const runsDir = `${outDir}/runs`
const pages = [
  { name: 'home', path: '/' },
  { name: 'detalhe', path: '/nft/nft_12' },
]
// mobile usa o padrão do Lighthouse (Moto G Power, 4G lento, CPU 4x)
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

await mkdir(runsDir, { recursive: true })
const chrome = await launch({ chromePath, chromeFlags: ['--headless=new', '--no-sandbox'] })
const summary = []
let version = ''
let userAgent = ''

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
        userAgent = result.lhr.environment.hostUserAgent
        const scores = Object.fromEntries(Object.entries(result.lhr.categories).map(([id, category]) => [id, Math.round(category.score * 100)]))
        const prefix = `${runsDir}/${page.name}-${profile}-${run}`
        runsResult.push({
          run,
          scores,
          lcp: result.lhr.audits['largest-contentful-paint'].numericValue,
          tbt: result.lhr.audits['total-blocking-time'].numericValue,
          cls: result.lhr.audits['cumulative-layout-shift'].numericValue,
          prefix,
        })
        await writeFile(`${prefix}.report.json`, result.report[0])
        await writeFile(`${prefix}.report.html`, result.report[1])
      }
      const medians = Object.fromEntries(Object.keys(targets).map((id) => [id, median(runsResult.map((entry) => entry.scores[id]))]))
      // Relatório versionado: a execução com a mediana de Performance
      const representative = runsResult.find((entry) => entry.scores.performance === medians.performance) ?? runsResult[0]
      await copyFile(`${representative.prefix}.report.html`, `${outDir}/${page.name}-${profile}.report.html`)
      await copyFile(`${representative.prefix}.report.json`, `${outDir}/${page.name}-${profile}.report.json`)
      summary.push({
        page: page.name,
        profile,
        runs: runsResult.map((entry) => ({ run: entry.run, scores: entry.scores, lcp: entry.lcp, tbt: entry.tbt, cls: entry.cls })),
        medians,
        medianMetrics: {
          lcpMs: Math.round(median(runsResult.map((entry) => entry.lcp))),
          tbtMs: Math.round(median(runsResult.map((entry) => entry.tbt))),
          cls: median(runsResult.map((entry) => entry.cls)),
        },
        report: `${page.name}-${profile}.report.html`,
        passed: Object.entries(targets).every(([id, goal]) => medians[id] >= goal),
      })
      console.log(page.name, profile, JSON.stringify(medians))
    }
  }
} finally {
  await chrome.kill()
}

const environment = {
  date: new Date().toISOString(),
  node: process.version,
  os: `${os.type()} ${os.release()} ${os.arch()}`,
  cpus: os.cpus().length,
  browser: userAgent,
  server: 'vite preview (build de produção com mocks ligados, cenário padrão)',
}

await writeFile(`${outDir}/summary.json`, JSON.stringify({ lighthouse: version, environment, base, runs, targets, summary }, null, 2))
