# Customization Map

Use these files to personalize StudyApp visuals and tone.

## Core Branding

- `src/config/branding.ts`
  - app name
  - homepage copy
  - planner title/subtitle
  - mascot name
  - global gradient class
  - image paths

## Images and Wallpapers

- `public/wallpapers/home-hero.svg`
  - homepage hero artwork
- `public/mascots/pico.svg`
  - mascot image used in planner and future widgets

You can replace these files with `.svg`, `.png`, or `.jpg`.
If you keep the same filename, no code changes are needed.

## Layout and Style

- `src/app/layout.tsx`
  - top navigation
  - login button placement
- `src/app/page.tsx`
  - homepage sections and CTAs
- `src/app/planner/page.tsx`
  - planner visuals and content structure
- `src/app/globals.css`
  - global UI defaults (font, transitions, base colors)

## Recommended Workflow

1. Update `src/config/branding.ts`.
2. Replace `public/wallpapers/home-hero.svg`.
3. Replace `public/mascots/pico.svg`.
4. Tune component-level styling in `src/app/page.tsx` and `src/app/planner/page.tsx`.
