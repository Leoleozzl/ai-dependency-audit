# AI Dependency Audit Toolkit

[中文文档](README.md) | English

> A methodology + toolkit for auditing **what breaks when your LLM provider goes down**.

When DeepSeek went down for ~5 hours on 2026-10-15 (web + API both dead), most apps built on it simply stopped working. Claude had a 3-hour global outage on 2026-08-24. The question this toolkit tries to answer:

**If your AI provider disappears tomorrow, can your business still run — and how?**

---

## What's Inside

### 📚 Methodology
A four-step audit process:

```
① Dependency Discovery → ② Criticality Assessment → ③ Substitutability Check → ④ Exit Drill Report
```

Plus a **Criticality × Substitutability Matrix (CSM)**, adapted from the Oxford *AI Resilience Gap* framework, and a one-page printable checklist.

### 🛠️ Tools (pure Node.js, zero dependencies)

| Tool | What it does |
|------|-------------|
| `scanner.js` | Scans your codebase for AI call sites, config storage, and prompt templates. **Regex-based — it does not call any AI.** |
| `report-generator.js` | Renders an HTML audit report with dark/light theme support |
| `substitution-test.js` | Tests whether a candidate model can replace your current one (category match rate / JSON validity / latency) |

### 📊 A Real Case Study

A full audit of a real project (243 files, a multimodal note-taking app). Findings:
- **2 high-risk dependencies** (Quadrant II: text recognition service, speech-to-text)
- **2 latent-risk dependencies** (Quadrant IV: config storage, hardcoded prompts)
- **5 remediation proposals** with code samples and effort estimates

See [案例-智能个人记录本审计报告.md](案例-智能个人记录本审计报告.md) (Chinese).

---

## Quick Start

```bash
# 1. Scan a project
node tools/scanner.js /path/to/your-project

# 2. Generate the visual report
node tools/report-generator.js ./scan-result.json

# 3. (Optional) Test model substitutability
cp tools/test-config.example.json tools/test-config.json
# edit with your API keys, then:
node tools/substitution-test.js ./test-config.json
```

No `npm install` required. Node.js 14+.

---

## Design Boundaries

After decomposing "dealing with AI dependency" into a value chain, this toolkit deliberately covers only the **cognition & drill layer**:

| Layer | Covered? |
|-------|----------|
| ① Dependency mapping | ✅ |
| ② Substitutability assessment | ✅ |
| ③ Switching decision | ⚪ Partial |
| ④ Automatic failover execution | ❌ (LiteLLM / OpenRouter already do this well) |
| ⑤ Exit drill | ✅ |
| ⑥ Manual degradation / handover | ✅ |

**The core logic does not depend on AI.** This is intentional: an audit tool for AI dependency that breaks when AI breaks would be pointless.

---

## Background

The problem has been formally named by researchers and industry, but tooling lags behind:

- **Oxford University**, *The AI Resilience Gap* (arXiv:2607.07359, 2026-07) — introduces the AI Resilience Framework (ARF), the CSM matrix, and *silent degradation* as an AI-specific failure mode
- **Cloud Security Alliance**, *AI Provider Concentration Risk* (2026-06) — high-signal outage days went from 6 (2025 Q1) to 51 (2026 Q1); 91% of executives are not fully aware of their AI dependencies
- Commercial tools (Drata, Credo AI, VerifyWise, …) focus on **enterprise compliance**, not exit readiness — and none target small teams or indie developers

This project sits in that gap.

---

## References

- Oxford University, *The AI Resilience Gap* — arXiv:2607.07359
- Cloud Security Alliance, *AI Provider Concentration Risk: Enterprise Resilience* (2026-06)
- Real outage cases: DeepSeek (2026-10-15), Claude (2026-08-24), Claude Fable 5 export-control suspension (2026-06-12 – 07-01)

---

## Limitations

- The substitutability test currently uses simulated data; a real run requires DB access and live API keys
- Scanning is regex-based (no AST parsing yet), so detection in heavily abstracted frameworks is limited
- Currently supports JS / TS / Python / Java

---

## License

MIT
