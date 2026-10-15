---
version: alpha
name: Ohmnia PV — Frame (remix du preset blue-professional)
description: >
  Charte vidéo d'Ohmnia PV, construite sur les atomes du preset blue-professional (cartes teintées
  sans ombre, chrome en pilule, échelle de gris resserrée, un accent fort) puis remappée sur la marque :
  bleu du logo (#0151A2) comme accent principal, orange soleil (#FB9500) comme second accent rare,
  encre navy, fond clair légèrement froid. Acte 1 (problème) en « nuit » navy désaturée ; à partir de
  la bascule, fond clair solaire. Les écrans de l'app gardent leur thème sombre d'origine.
unit: the frame — 1920×1080
principle: atoms are sacred · composition is free · numbers come from the script

colors:
  bg: "#F5F7FB"
  primary: "#0151A2"
  sun: "#FB9500"
  text: "#0B1F3F"
  text-muted: "#475569"
  text-light: "#94A3B8"
  accent-light: "rgba(1, 81, 162, 0.08)"
  accent-medium: "rgba(1, 81, 162, 0.15)"
  border: "rgba(1, 81, 162, 0.2)"
  card-bg: "rgba(1, 81, 162, 0.04)"
  positive: "#16A34A"
  negative: "#DC2626"
  night: "#080F1B"
  night-2: "#0E1A30"
  night-ink: "#C9D3E3"
  app-bg: "#080F1B"
  app-surface: "#11192D"
  app-header: "#10274B"
  app-border: "#38445A"
  app-amber: "#F59F00"
  app-green-bg: "#113328"
  app-green: "#22A35A"
  app-red-bg: "#52151A"
  app-red: "#E5484D"
  paper: "#FFFFFF"

radii:
  pill: "100px"
  card-lg: "14px"
  card-md: "12px"
  card-sm: "10px"
  bar: "6px"
  phone: "64px"
  circle: "50%"

typography:
  body:        { fontFamily: "Inter", cqw: 0.85, weight: 400, lineHeight: 1.6, color: "text-muted" }
  h4-eyebrow:  { fontFamily: "Inter Display", cqw: 0.8, weight: 700, tracking: "0.12em", upper: true, color: "primary" }
  tag:         { fontFamily: "Inter", px: 22, weight: 600, color: "primary" }
  h3:          { fontFamily: "Inter Display", cqw: 1.6, weight: 700, lineHeight: 1.2, tracking: "-0.02em", color: "text" }
  stat-num:    { fontFamily: "Inter Display", cqw: 2.6, weight: 800, lineHeight: 1.0, color: "primary" }
  h2:          { fontFamily: "Inter Display", cqw: 3.4, weight: 800, lineHeight: 1.05, tracking: "-0.025em", color: "text" }
  h1:          { fontFamily: "Inter Display", cqw: 5.2, weight: 900, lineHeight: 1.0, tracking: "-0.03em", color: "text" }
  app-ui:      { fontFamily: "Inter", weight: "500–700", color: "#E9ECF5", note: "texte des écrans de l'app" }

spacing:
  pad-x: "5cqw"
  pad-y-top: "5cqw"
  gap-cards: "1.4cqw"
  accent-line: "72px × 6px"

components:
  card-tinted:
    backgroundColor: "{colors.card-bg}"
    border: "1.5px solid {colors.border}"
    rounded: "{radii.card-lg}"
    shadow: "none"
    description: "Carte de contenu universelle sur fond clair. Jamais d'ombre."
  tag-pill:
    backgroundColor: "{colors.accent-light}"
    textColor: "{colors.primary}"
    rounded: "{radii.pill}"
    description: "Étiquette en pilule (eyebrow de scène)."
  cta-button:
    backgroundColor: "{colors.sun}"
    textColor: "{colors.text}"
    rounded: "{radii.pill}"
    typography: "Inter Display 800"
    description: "Le seul élément plein orange — reprend le bouton « Nouvelle intervention » de l'app."
  accent-line:
    backgroundColor: "{colors.sun}"
    size: "72×6, 3px radius"
    description: "Au-dessus des titres ; c'est le « rayon de soleil » de la marque."
  phone:
    frame: "#0B0F17 bezel 18px, rounded {radii.phone}, ombre portée douce (seule ombre autorisée : objet physique)"
    screen: "UI recréée de l'app : header {colors.app-header}, fond {colors.app-bg}, cartes {colors.app-surface}, bordures {colors.app-border}, accent {colors.app-amber}"
    description: "Mockup smartphone portant les écrans de l'app, toujours en thème sombre."
  field-ok:
    backgroundColor: "{colors.app-green-bg}"
    border: "2px solid {colors.app-green}"
    description: "Champ de relevé validé (coche verte)."
  field-alert:
    backgroundColor: "{colors.app-red-bg}"
    border: "2px solid {colors.app-red}"
    description: "Champ hors seuil (triangle d'alerte rouge) → anomalie."
  badge-anomalies:
    backgroundColor: "#B81A1B"
    textColor: "#FFFFFF"
    rounded: "{radii.pill}"
    description: "Pastille « N anomalies »."
  report-page:
    backgroundColor: "{colors.paper}"
    header: "bandeau {colors.app-header} + filet {colors.sun}"
    description: "Page du rapport PDF (blanc, tableaux navy, résultats vert/rouge)."
  logo:
    asset: "assets/logo-ohmnia-pv.png (complet), assets/logo-ohmnia-emblem.png (Ω), assets/logo-ohmnia-wordmark.png (nom)"
    description: "Logo officiel fourni par le client, toujours sur fond clair (ou carte blanche arrondie sur fond sombre). Ne jamais recolorer."
---

# Ohmnia PV — Frame

## Brand adaptation (READ FIRST — the frontmatter is the source of truth)

Remix du preset **blue-professional** corrigé à la main (le remappage automatique avait doublé les
noms de police et peint le texte secondaire en ambre). Les valeurs du frontmatter font foi.

- **Polices** — **Inter Display** (titres, chiffres, chrome) / **Inter** (texte, UI de l'app), fichiers
  locaux dans `assets/fonts/`.
- **Couleurs** — bleu logo `primary` pour les accents, orange `sun` réservé aux moments « soleil »
  (rayon au-dessus des titres, CTA, lumière de la bascule). Titres en `text` navy, jamais en orange.
- **Deux mondes** — l'acte 1 (problème) se joue sur `night` (navy quasi noir, éléments désaturés
  `night-ink`) ; la bascule fait lever le soleil et le fond devient `bg` clair pour le reste du film.
- **L'app** — les écrans de l'application restent dans leur thème sombre d'origine, dans un mockup de
  téléphone : c'est l'objet héros, il ressort sur le fond clair.

## Overview

Un registre **pro, net, solaire** : la retenue du preset (cartes teintées sans ombre, pilules,
gris resserrés) au service d'une histoire « de la paperasse de nuit à l'intervention bouclée en plein
jour ». Un message par scène, un titre court qui domine, le téléphone ou le document comme héros.

## Composition Rules

### Do

- Un seul titre court par scène (≤ 6 mots), navy, Inter Display 800–900, −0.025em.
- Le rayon orange (accent-line) au-dessus des titres ; le bleu porte les eyebrows et les chiffres.
- Cartes teintées sans ombre sur fond clair ; l'unique ombre est celle des objets physiques
  (téléphone, feuilles, rapport papier).
- Garder tout le contenu au-dessus de 900 px (bande basse réservée).

### Don't

- Pas de chiffres inventés : seuls « 2 heures » (script) et les valeurs de démo des captures.
- Pas de logo recoloré, pas de logo sur fond sombre sans carte blanche.
- Pas de texte de narration recopié en phrases entières : titres courts uniquement.

## Numerals & Claims (hard rule)

Never invent figures as claims. Aucune statistique ni promesse chiffrée inventée (pas de « −40 % »,
pas de « 500 clients ») : le seul chiffre-argument est « 2 heures » / « 2 h » (script utilisateur).
Les données de démonstration affichées DANS l'interface (valeurs de relevés, dates d'interventions,
noms de sites « (démo) ») sont du contenu d'UI, autorisé, et reprennent autant que possible les
valeurs des captures (9,53 kW, 4,29 kW, 236,4 V, 18,2 A, 45 MΩ, 850 W/m², 24 °C, 48 °C,
5 anomalies, 6 pages, 251 Ko, 15/10/2026).

## Font loading (auto-generated)

The brand font ships as local files in `assets/fonts/` — do NOT link Google Fonts for it. Paste this
`<style>` into every frame's `<template>` so `font-family` resolves in preview, snapshot, and render:

```html
<style>
@font-face{font-family:"Inter";font-weight:400;font-style:normal;font-display:block;src:url("assets/fonts/Inter-Regular.woff2") format("woff2");}
@font-face{font-family:"Inter";font-weight:500;font-style:normal;font-display:block;src:url("assets/fonts/Inter-Medium.woff2") format("woff2");}
@font-face{font-family:"Inter";font-weight:600;font-style:normal;font-display:block;src:url("assets/fonts/Inter-SemiBold.woff2") format("woff2");}
@font-face{font-family:"Inter";font-weight:700;font-style:normal;font-display:block;src:url("assets/fonts/Inter-Bold.woff2") format("woff2");}
@font-face{font-family:"Inter";font-weight:800;font-style:normal;font-display:block;src:url("assets/fonts/Inter-ExtraBold.woff2") format("woff2");}
@font-face{font-family:"Inter Display";font-weight:600;font-style:normal;font-display:block;src:url("assets/fonts/InterDisplay-SemiBold.woff2") format("woff2");}
@font-face{font-family:"Inter Display";font-weight:700;font-style:normal;font-display:block;src:url("assets/fonts/InterDisplay-Bold.woff2") format("woff2");}
@font-face{font-family:"Inter Display";font-weight:800;font-style:normal;font-display:block;src:url("assets/fonts/InterDisplay-ExtraBold.woff2") format("woff2");}
@font-face{font-family:"Inter Display";font-weight:900;font-style:normal;font-display:block;src:url("assets/fonts/InterDisplay-Black.woff2") format("woff2");}
</style>
```
