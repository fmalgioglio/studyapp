# StudyApp Interaction OS

Documento guida per progettare, sviluppare e far evolvere StudyApp con una collaborazione uomo-macchina ad alta efficienza.

Obiettivo: ridurre attrito informativo, preservare contesto nel tempo, aumentare la qualita delle decisioni e la velocita di delivery.

## 1) Identita Del Progetto

`StudyApp` e una piattaforma edtech che trasforma la preparazione esami in un sistema:

- pianificabile
- misurabile
- motivante
- adattivo

Il cuore e un motore stocastico e research-based che stima carico, tempo e probabilita di completamento, poi si calibra sul comportamento reale dello studente.

## 2) Assunto Fondativo Uomo + AI

L'AI ha ampiezza informativa.
L'umano ha intenzione, contesto profondo, visione etica e direzione strategica.

Il valore nasce dalla sinergia disciplinata tra questi due piani.

Rischi principali da controllare:

- perdita di contesto tra sessioni
- dispersione di decisioni non tracciate
- overfitting su idee non validate
- saturazione del canale conversazionale (token, memoria, priorita)

## 3) Principi Operativi (Non Negoziabili)

1. `Single Source of Truth`: ogni decisione critica deve vivere in un file persistente.
2. `Small Loops, Hard Evidence`: iterazioni brevi, validate da test o output osservabile.
3. `Decision Before Code`: definire scopo, vincoli, metrica successo prima dell'implementazione.
4. `No Silent Assumptions`: ogni assunzione non ovvia deve essere scritta.
5. `Privacy By Default`: nessun dato sensibile in repo o documentazione pubblica.
6. `Composable Architecture`: feature modulari, integrabili in roadmap web -> mobile -> agentic.

## 4) Geometria Dei Documenti (Scheletro)

Questi file costituiscono il nucleo cognitivo del progetto.

- `README.md`: visione pubblica, setup, roadmap high-level.
- `README.dev.md`: architettura tecnica e workflow sviluppatore.
- `docs/ml-maturity-plan.md`: traiettoria modelli M0 -> M4.
- `docs/research-estimator-basis.md`: fondamenti scientifici estimator.
- `docs/server-test-flow.md`: protocollo test end-to-end.
- `docs/customization-map.md`: mappa personalizzazione UI/branding.
- `docs/interaction-os-skeleton.md`: sistema operativo uomo-AI (questo file).

Regola: se una scelta cambia strategia, qualita o comportamento prodotto, aggiorna almeno un documento di questo nucleo.

## 5) Ruoli Multi-Agent (Uomo-Macchina)

Per scalare su piu terminali/agenti, separare ruoli e responsabilita.

### Ruolo A - Product Strategist (Umano)

- definisce problema, priorita e tradeoff
- approva metriche di successo
- decide cosa non costruire

### Ruolo B - ML Architect (AI/Umano)

- governa estimator, calibrazione, validazione statistica
- propone esperimenti e guardrail
- mantiene coerenza scientifica

### Ruolo C - App Engineer (AI/Umano)

- implementa feature web/mobile
- mantiene architettura pulita, testabile, leggibile
- riduce debito tecnico

### Ruolo D - Research Curator (AI)

- raccoglie paper e fonti primarie
- sintetizza evidenze applicabili
- segnala limiti metodologici

### Ruolo E - QA And Reliability (AI/Umano)

- definisce checklist regressione
- valida flussi end-to-end
- blocca merge se i gate non passano

## 6) Protocollo Di Sessione (Anti-Dispersione)

Ogni sessione dovrebbe seguire questo ciclo.

1. `Intent`: cosa vogliamo ottenere oggi.
2. `Constraints`: vincoli tecnici/prodotto/privacy.
3. `Plan`: 3-5 passi concreti.
4. `Execution`: implementazione modulare.
5. `Verification`: lint, build, test, smoke flow.
6. `Memory Update`: aggiornamento documenti chiave.
7. `Handoff`: stato finale + prossime azioni.

Template minimo di handoff:

```md
## Session Handoff
- Goal:
- Done:
- Not done:
- Risks:
- Decisions taken:
- Next step (first command/file):
```

## 7) Token Economy E Bandwidth Management

Per aumentare efficacia cognitiva uomo-macchina:

- usare task chunked (vertical slice piccoli)
- evitare richieste multi-obiettivo non priorizzate
- trasformare discussioni lunghe in decision log sintetici
- mantenere naming consistente tra UI/API/docs
- esplicitare sempre il livello di confidenza (alto/medio/basso)

Pattern consigliato per richieste:

```md
Context:
Goal:
Constraints:
Acceptance Criteria:
Out of Scope:
```

## 8) Contratti Tra Pagine (Seamless UX)

Nel dominio StudyApp, le entita fondamentali sono:

- `Student`
- `Subject`
- `Exam`
- `FocusSession`
- `Estimate`

Regola di coerenza:

- ogni `FocusSession` deve poter impattare almeno un `Exam` target
- ogni `Exam` deve comparire in `Season Timeline` e `Subject Hub`
- la traduzione EN/IT non deve alterare i dati, solo la presentazione

## 9) Quality Gates (Definition of Done)

Una feature e considerata pronta solo se:

1. funziona nel flusso utente reale
2. passa `npm run lint`
3. passa `npm run build`
4. non rompe EN/IT
5. non introduce leak privacy/security
6. aggiorna documentazione minima necessaria

## 10) Privacy, Open Source, E Distribuzione

Linea guida strategica:

- repo open source pulito e didattico
- deployment separato da dati personali
- configurazioni sensibili solo via env locali/secret manager

Checklist pre-push:

- no `.env*` tracciati
- no token/password/chiavi in codice o docs
- no credenziali demo hardcoded in chiaro
- asset con licenza compatibile open source

## 11) Timeline Evolutiva (Adattiva)

### Fase 1 - Functional Foundation (Web)

- stabilita auth, CRUD, planner, focus, estimator
- coerenza dati cross-page
- documentazione e test base solidi

### Fase 2 - Engagement Layer (Gamified)

- loop ricompensa robusti e non manipolativi
- missioni, streak, social light
- UX mobile-first consolidata

### Fase 3 - Agentic Intelligence

- coaching adattivo e raccomandazioni proattive
- scheduling dinamico con uncertainty esplicita
- explainability delle decisioni modello

### Fase 4 - Multi-Client Ecosystem

- web + app store + backend affidabile
- orchestrazione multi-agent su workflow reali
- governance prodotto/ML/operazioni

## 12) Decision Log (ADR Light)

Quando una decisione cambia direzione architetturale o prodotto, registrare:

```md
Date:
Decision:
Context:
Options considered:
Chosen option:
Expected impact:
Rollback plan:
Owner:
```

## 13) Primo Uso Per Nuovi Collaboratori (No Prior-Knowledge)

Onboarding rapido:

1. leggere `README.md`
2. leggere `README.dev.md`
3. leggere `docs/interaction-os-skeleton.md`
4. eseguire `docs/server-test-flow.md`
5. prendere un task piccolo con criteri di accettazione chiari

## 14) Personalita Operativa Di StudyApp

Tono e comportamento del progetto:

- rigoroso ma accessibile
- motivante ma trasparente
- creativo ma misurabile
- ambizioso ma incrementale

Questa personalita deve riflettersi in:

- copy UI
- interazioni della mascotte
- feedback utente
- stile delle decisioni tecniche

