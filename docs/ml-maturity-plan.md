# ML Maturity Plan (M0 -> M4)

This roadmap keeps StudyApp practical and science-driven.

## M0 - Deterministic Baseline

Goal: deliver immediate planning value with transparent logic.

- Methods:
  - rule-based workload conversion (`pages -> effective words -> minutes`)
  - fixed difficulty multipliers
  - fixed buffer/revision multipliers
- Inputs:
  - exam date
  - weekly hours
  - subject
  - book title
  - optional known pages
- Success metrics:
  - users can generate plan in under 60 seconds
  - less than 5% API error rate

Gate to M1:
- at least 100 generated plans
- stable endpoint latency and no major UX confusion

## M1 - Stochastic Cold Start

Goal: move from fixed values to uncertainty-aware estimates.

- Methods:
  - priors by subject/book type
  - Monte Carlo simulation (1,000 runs)
  - probabilistic completion estimate
- Output:
  - pages/day range
  - minutes/day range
  - completion probability
  - extra minutes/day for target success rate
- Success metrics:
  - calibration plots show reasonable uncertainty bands
  - plan acceptance rate improves vs M0

Gate to M2:
- at least 1,000 planning runs with telemetry
- stable prior categories for common subjects

## M2 - Personalized Bayesian Calibration

Goal: adapt model to each student and subject.

- Methods:
  - Bayesian posterior updates for study speed and reduction behavior
  - personal pace from completed session data
  - retention proxy for quality adjustment
- Required tracking:
  - session minutes
  - pages completed
  - retention check score (quick quiz/confidence)
- Success metrics:
  - prediction error decreases over first 5-10 sessions
  - higher on-time completion vs non-personalized baseline

Gate to M3:
- enough per-user repeated sessions (median >= 8)
- measurable prediction improvement over M1

## M3 - Decision Optimization

Goal: optimize next-best action without high-risk complexity.

- Methods:
  - contextual bandits for choosing session length / review strategy
  - outcome-based reward on adherence + retention
- Candidate actions:
  - 25 vs 40 vs 50 minute session
  - reading-first vs retrieval-first block
  - revision timing options
- Success metrics:
  - uplift in completion probability
  - uplift in retention score

Gate to M4:
- statistically significant uplift across cohorts
- no fairness or instability regressions

## M4 - Advanced Sequence Models (Optional)

Goal: long-horizon personalized planning and intervention.

- Methods:
  - knowledge tracing / temporal models
  - survival modeling for dropout and missed-plan risk
  - offline reinforcement learning only after robust logs
- Constraints:
  - only adopt if M3 plateau is clear
  - strong offline evaluation before any online rollout

## Evaluation Standards

- Primary product metrics:
  - on-time exam readiness rate
  - adherence to planned sessions
  - weekly retention trend
- Model quality metrics:
  - calibration error
  - prediction interval coverage
  - MAE on required minutes/day
- Guardrails:
  - never hide uncertainty
  - avoid over-confident recommendations
  - allow manual override in all plans
