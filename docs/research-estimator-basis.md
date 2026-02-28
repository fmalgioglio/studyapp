# Research Basis For Cold-Start Estimation

This file describes how the estimator works when a user has no personal pace samples yet.

## Model goals

- Give a usable first estimate for new users.
- Keep uncertainty explicit (`recommended` vs `safe` targets).
- Converge quickly toward user-specific calibration once samples are collected.

## Evidence anchors used

1. Reading benchmark prior:
- Trauzettel-Klosinski et al. (2012), IReST reading benchmark.
- Baseline used in app: around `184 +/- 29 wpm` for reference reading behavior.

2. Memory and retention:
- Yang et al. (2021), meta-analysis on quizzing/retrieval practice.
- Trumble et al. (2024), systematic review on retrieval + spacing.
- App implication: conservative profiles assume better retention than fast profiles until personal evidence is available.

3. Time-on-task fatigue:
- Zanesco et al. (2024), vigilance/mind wandering evidence under sustained tasks.
- App implication: long uninterrupted daily loads are penalized with a fatigue multiplier.

4. Sleep-related memory pressure:
- Crowley et al. (2024), sleep restriction and cognitive performance meta-analysis.
- App implication: safe targets include an uncertainty buffer instead of assuming perfect daily consolidation.

## Cold-start fusion logic

The estimator blends:
- Subject priors (`subject` difficulty and text density),
- Pace profile prior (`conservative`, `balanced`, `fast`),
- Multimodal text signals from `bookTitle + notes`:
  - complexity keywords,
  - support keywords (notes/slides/summary),
  - compression keywords (essentials/review).

Result:
- Prior speed distribution for Monte Carlo simulation,
- Safe pages/day and minutes/day under uncertainty,
- A transparent model metadata block in API response.

## Transition to personalization

When user sessions are available, the model shifts from `profile_prior` to `user_samples` via Bayesian posterior updates.
