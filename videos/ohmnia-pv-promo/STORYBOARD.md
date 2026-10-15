---
format: 1920x1080
duration: 60s
message: "Avec Ohmnia PV, l'intervention photovoltaïque se boucle sur place, rapport compris : fini les heures de paperasse."
arc: Accroche → Problème → Bascule (logo) → Saisie terrain → Rapport → Historique → Bénéfices → CTA
audience: Installateurs PV, sociétés de maintenance, exploitants de centrales (B2B)
mode: autonomous
music: original synthesized bed — tense minor pulse (0–15 s), sunrise drop into bright major groove (15–54 s), sting + ring-out (54–60 s), 120 BPM
captions: skipped (titres cinétiques courts à l'écran ; voix off en attente)
---

## Video direction

- **Palette (frame.md)** — Acte 1 (0–15 s) sur `night` #080F1B / `night-2` #0E1A30, éléments désaturés
  `night-ink` #C9D3E3, rouge `negative` réservé aux alertes. À la bascule (15 s) le soleil `sun` #FB9500
  se lève et le fond passe à `bg` #F5F7FB pour tout le reste du film. Titres navy `text` #0B1F3F en
  Inter Display 800–900, eyebrows et chiffres en `primary` #0151A2, rayon orange (accent-line) au-dessus
  des titres. Écrans de l'app dans leur thème sombre d'origine (app-* tokens), dans un mockup de téléphone.
- **Grammaire de mouvement** — tout en long-tail (`power3` / `expo.out` sur les arrivées rapides), jamais
  de rebond. Chaque élément arrive sur sa réplique de voix off (révélations séquentielles réparties sur
  toute la scène, surtout la seconde moitié). Pendant un temps de lecture : immobilité, au plus un
  léger jitter. Coutures internes = coupes à vitesse accordée (cut-catalog).
- **Rythme** — temps forts : 15 s (bascule, impact musical), 30 s (rapport), 54 s (CTA). Respirations
  tenues : fin de la scène 3 (logo + accroche lue en silence visuel), fin de la scène 7 (triptyque tenu).
  La scène 2 est volontairement la plus chargée (le chaos), la scène 3 la plus vide (l'ordre).
- **Liste négative** — pas de rebond/elastic, pas de respiration en boucle, pas de pan/push lent en
  seconde moitié, pas de particules aléatoires, pas de dégradés « IA » violets, pas de faux chiffres
  (seul argument chiffré : « 2 h »), pas de logo recoloré ni posé sur fond sombre sans carte blanche,
  pas de phrase de voix off recopiée en entier à l'écran (titres courts uniquement), rien sous y = 900 px.
- **Continuité** — le problème et la bascule sont une seule composition (02-chaos-bascule, archétype
  « multi-scene merge ») : les éléments du chaos sont les mêmes objets DOM qui « se rangent d'un coup »
  à 15 s, sans coupure. 01→02 : coupe franche sur le temps (nuit → nuit, les feuilles volent encore).
- **Voix off (Gemini TTS, Charon)** — placements absolus : L1 0.00 · L2 5.30 · L3 15.55 · L4 22.35 ·
  L5 30.30 · L6 38.25 · L7 46.25 · L8 54.30 ; les révélations sont calées sur les mots (silencedetect).

## Frame 1 — Accroche

- src: compositions/frames/01-accroche.html
- duration: 5s
- transition_in: cut
- status: animated
- type: hook
- scene: Toit photovoltaïque en plein jour → le soleil se couche dans la pause de la voix → la pile de papiers s'envole la nuit
- voiceover: "Une intervention photovoltaïque, c'est deux heures sur le toit… et deux heures de paperasse."
- blueprint: kinetic-type-beats (Adapt)
- asset_candidates: none — illustration vectorielle (toit, panneaux, soleil, feuilles)
- focal: le toit photovoltaïque puis la pile de papiers
- roles: toit = cutout · ciel = background · feuilles = supporting
- sfx: whoosh-down 3.28 · paper-rustle 3.70 · paper-flutter 3.92
- poster: 4.6

Adapt : les deux temps de phrase se construisent (le titre est l'argument) ; le « swap » se fait par le
décor : le jour devient nuit pile dans la pause de la voix.
Scene 1 (0.0–2.1s): plein jour (palette froide bleutée, soleil orange seul accent chaud) ; maison au toit
de panneaux PV centre-droit (~40 % du cadre, 3 plans : ciel / maison / collines) monte en place ; les
panneaux s'allument en vague, un reflet balaie le toit ; pilule « INTERVENTION DE MAINTENANCE ».
Scene 2 (2.1–3.3s): sur « deux heures sur le toit », horloge (aiguilles qui tournent de 2 h) + « 2 h sur
le toit… » mot à mot, « 2 h » en orange.
Scene 3 (3.3–3.8s): pause de la voix : le soleil plonge derrière la colline, nuit navy, étoiles,
fenêtres qui s'allument en jaune chaud ; le titre passe en blanc.
Scene 4 (3.8–5.0s): sur « et deux heures de paperasse », pile de feuilles au premier plan puis envolée
de 14 feuilles en 3D (trajectoires déterministes) ; « … et 2 h de paperasse. », « 2 h » en rouge,
« paperasse » souligné en rouge.

## Frame 2 — Problème → Bascule

- src: compositions/frames/02-chaos-bascule.html
- duration: 17s
- transition_in: cut
- status: animated
- type: pain_point
- scene: La nuit, l'administratif s'accumule et encercle (fiches, photos perdues, rapport en retard, SMS, tableur, client qui attend) ; à 10 s tout se range d'un coup, le soleil se lève et le logo Ohmnia PV apparaît
- voiceover: "Fiches papier, photos dispersées, rapports en retard : vos équipes perdent du temps, et vos clients attendent. Ohmnia PV : l'application de maintenance photovoltaïque pensée pour les pros."
- blueprint: overwhelm-surround (Adapt) → logo-assemble-lockup (Adapt)
- asset_candidates: assets/logo-ohmnia-emblem.png, assets/logo-ohmnia-wordmark.png
- focal: l'amoncellement central (0–10 s), puis assets/logo-ohmnia-emblem.png (10–17 s)
- roles: objets du chaos = supporting · logo-ohmnia-emblem = cutout (héros) · logo-ohmnia-wordmark = supporting
- sfx: paper-rustle 5.55 · photo-flick ×5 6.65–7.1 · stamp 8.35 · sms 9.3 / 9.7 / 10.1 · error 9.95 · notif 10.95 · snap 15.05 · sunrise 15.55 · shimmer 15.85
- poster: 13.5

Adapt (problème) : l'accumulation qui encercle puis se resserre ; la « victime » est l'écran lui-même.
Adapt (bascule) : la marque vient à exister sur une scène dégagée par le rangement du chaos et un
lever de soleil, puis se verrouille en lockup.
Scene 1 (0.0–1.6s): nuit navy, halo de lampe ; sur « Fiches papier » (0.56), 3 fiches d'intervention
manuscrites glissent au centre-gauche ; étiquette « Fiches papier ».
Scene 2 (1.6–3.0s): sur « photos dispersées » (1.65), 5 polaroids s'éparpillent jusqu'aux bords ;
étiquette « Photos dispersées ».
Scene 3 (3.0–4.2s): sur « rapports en retard » (3.03), un rapport arrive à droite, tampon rouge
« EN RETARD » ; étiquette « Rapports en retard ».
Scene 4 (4.2–5.9s): sur « vos équipes perdent du temps » (4.27), bulles SMS, tableur
« suivi_interventions_v3_FINAL.xlsx » avec erreurs, horloge qui s'emballe.
Scene 5 (5.9–7.4s): sur « et vos clients attendent » (5.96), notification client « en attente du
rapport · J+7 », pastilles rouges ; titre « Du temps perdu. Des clients qui attendent. ».
Scene 6 (7.4–10.0s): tout se resserre vers le centre (encerclement), tremblement croissant, figé à 9.7.
Scene 7 (10.0–10.75s): impact musical : tout s'aligne d'un coup en grille parfaite puis se rétracte au
centre en un point de lumière orange.
Scene 8 (10.75–11.8s): le disque de lumière inonde l'écran → fond clair ; l'emblème Ω éclot, halo
solaire ; le nom « Ohmnia PV » se révèle sur « Ohmnia PV » (10.85).
Scene 9 (11.8–15.6s): le lockup remonte ; « L'application de maintenance photovoltaïque » (12.1) puis
« pensée pour les pros. » (14.65), « pour les pros » souligné d'un rayon orange.
Scene 10 (15.6–17.0s): lecture tenue, immobile.

## Frame 3 — Saisie terrain

- src: compositions/frames/03-saisie.html
- duration: 8s
- transition_in: blur-crossfade 0.5s
- status: animated
- type: feature_showcase
- scene: Le téléphone du technicien : relevés contrôlés (anomalie détectée), contrôles cochés, photos ajoutées
- voiceover: "Le technicien saisit tout sur place, en quelques gestes."
- blueprint: device-surface-showcase (Adapt)
- asset_candidates: capture/assets/app-releves-batterie.png, capture/assets/app-infos-client-site.png (référence d'UI recréée)
- focal: le téléphone (UI recréée, thème sombre)
- roles: téléphone = cutout (héros, droite) · titre = supporting (gauche)
- sfx: whoosh-soft 22.05 · check ×3 23.2–24.0 · alert 24.65 · tap 25.2 · check ×5 25.75–26.75 · tap 26.95 · tap 27.4 · shutter 27.5 / 27.95 / 28.4 · pop ×3
- poster: 6.9

Adapt : téléphone tenu en héros dont l'écran déroule un vrai flux (stepwise flow), des taps visibles,
titre à gauche.
Scene 1 (0.0–0.9s): téléphone (écran « Relevés » de Maison Durand) monte à droite, inclinaison 3D qui se
redresse ; eyebrow « SUR LE TERRAIN », rayon orange, titre « Tout se saisit sur place. » sur la voix.
Scene 2 (0.9–2.9s): les relevés se remplissent (11,0 V ✓, 18,2 A ✓, 45 MΩ ✓) ; « Tension de sécurité
S2 · 9,0 V » passe en rouge, toast « Anomalie détectée », pastille d'anomalies 3 → 4.
Scene 3 (2.9–4.7s): onglet « Contrôles » ; la checklist se coche (Structure et fixations : Non conforme
→ 5 anomalies) ; sous-titre « En quelques gestes. » sur la voix (3.08).
Scene 4 (4.7–6.6s): onglet « Photos » ; tap « Caméra », flash, trois vignettes popent.
Scene 5 (6.6–8.0s): lecture tenue ; puce « Hors ligne · tout est enregistré sur l'appareil ».

## Frame 4 — Rapport

- src: compositions/frames/04-rapport.html
- duration: 8s
- transition_in: push-slide LEFT 0.5s
- status: animated
- type: feature_showcase
- scene: Le client signe, le rapport PDF se génère et part par e-mail
- voiceover: "Le rapport est prêt à la fin de l'intervention. Plus de saisie le soir."
- blueprint: camera-journey (Adapt)
- asset_candidates: capture/assets/app-rapport-pdf-anomalies.png (référence des pages du rapport recréées)
- focal: le rapport PDF
- roles: téléphone = supporting (gauche) · pages du rapport = cutout (héros) · carte e-mail = supporting
- sfx: pen 30.25 · button 31.6 · pages 31.9 · tap 34.15 · send 34.6 · ding 35.1
- poster: 6.2

Adapt : cause → conséquence (un tap déclenche, le regard suit le résultat) : le rapport sort du
téléphone et voyage jusqu'à l'e-mail.
Scene 1 (0.0–1.6s): téléphone à gauche, écran « Validation » ; la signature « Durand » se trace ; titre
« Le rapport est prêt. » sur la voix (0.6).
Scene 2 (1.6–3.4s): tap « Générer le rapport » ; trois pages (couverture, contrôles, anomalies)
jaillissent et s'étalent en éventail sur « à la fin de l'intervention ».
Scene 3 (3.4–5.0s): sous-titre « Plus de saisie le soir. » + lune barrée (3.63) ; feuille de partage
« Drive partagé · Télécharger · E-mail ».
Scene 4 (5.0–8.0s): « E-mail » choisi, les pages se replient dans la carte e-mail « À : M. Durand
(client) · PDF · 6 pages · 251 Ko », envoi, toast « Envoyé ✓ » ; tenue.

## Frame 5 — Historique

- src: compositions/frames/05-historique.html
- duration: 8s
- transition_in: push-slide LEFT 0.5s
- status: animated
- type: benefit_highlight
- scene: Carte des sites et frise d'historique d'un site qui se déroule ; recherche instantanée
- voiceover: "Chaque site garde son historique : interventions, photos, suivi. Tout est retrouvable."
- blueprint: grid-card-assemble (Adapt)
- asset_candidates: capture/assets/app-liste-interventions.png (référence des cartes recréées)
- focal: la fiche du site avec sa frise
- roles: carte stylisée = supporting (gauche) · fiche site + frise = cutout (héros, droite)
- sfx: pin ×5 38.35–38.95 · whoosh-soft 39.1 · tick ×4 39.95–41.45 · key ×6 43.8–44.3 · check 44.45
- poster: 6.8

Adapt : la cascade qui s'assemble et tient est la frise chronologique d'un site.
Scene 1 (0.0–1.0s): carte stylisée (sans géographie réelle) où tombent les repères ; titre « Chaque site
garde son historique. » sur la voix.
Scene 2 (1.0–1.7s): le repère « Maison Durand » s'active, la fiche du site glisse à droite.
Scene 3 (1.7–5.2s): la frise se déroule (15/10/2026 maintenance, 22/04/2026 dépannage, 03/10/2025
maintenance conforme, 18/06/2025 mise en service) ; puces « Interventions · Photos · Suivi » sur leurs
mots (2.87 · 3.86 · 4.62).
Scene 4 (5.2–6.6s): sur « Tout est retrouvable » (5.51), la recherche tape « Durand », la fiche se
surligne.
Scene 5 (6.6–8.0s): tenue.

## Frame 6 — Bénéfices

- src: compositions/frames/06-benefices.html
- duration: 8s
- transition_in: blur-crossfade 0.5s
- status: animated
- type: benefit_highlight
- scene: Triptyque : moins d'administratif (temps gagné), plus d'interventions (agenda qui se remplit), image plus pro (rapports envoyés)
- voiceover: "Moins d'administratif, plus d'interventions, une image plus professionnelle."
- blueprint: grid-card-assemble (Adapt)
- asset_candidates: none — illustrations vectorielles (horloge, agenda, notifications)
- focal: la carte qui correspond à la réplique en cours
- roles: trois cartes = cutout (une à la fois) · fond = background
- sfx: hit-soft 46.75 / 48.4 / 50.05 · pop ×10 48.55–49.3 · sms ×3 50.25–50.85
- poster: 7.0

Adapt : trois cartes, chacune révélée sur sa réplique, puis le triptyque tient.
Scene 1 (0.0–1.9s): carte « Moins d'administratif » (0.56) : la pile fond en une feuille, l'arc orange
« temps gagné » se remplit autour d'une horloge.
Scene 2 (1.9–3.5s): carte « Plus d'interventions » (2.19) : la semaine d'agenda se remplit de créneaux.
Scene 3 (3.5–5.8s): carte « Une image plus pro » (3.83) : notifications « Rapport envoyé ✓ » qui
s'empilent sur un rapport scellé.
Scene 4 (5.8–8.0s): tenue.

## Frame 7 — Appel à l'action

- src: compositions/frames/07-cta.html
- duration: 6s
- transition_in: crossfade 0.5s
- status: animated
- type: cta
- scene: Logo Ohmnia PV, badge PRO, bouton « Essayez-le dès maintenant », URL ohmniapv.fr
- voiceover: "Ohmnia PV Pro. Essayez-le dès maintenant."
- blueprint: cta-morph-press (Adapt)
- asset_candidates: assets/logo-ohmnia-pv.png
- focal: assets/logo-ohmnia-pv.png
- roles: logo-ohmnia-pv = cutout (héros) · bouton = supporting
- sfx: shimmer 54.15 · button 57.25
- poster: 5.0

Adapt : la marque au repos mène l'œil vers l'action ; un tap ressenti sur le bouton (onde), pas de curseur.
Scene 1 (0.0–1.6s): fond clair, halo solaire et anneaux concentriques ; le logo complet se pose ;
badge « PRO » sur « Pro » (1.3).
Scene 2 (1.6–3.4s): sur « Essayez-le dès maintenant » (2.36), le bouton orange se déploie ; tap + onde.
Scene 3 (3.4–4.4s): l'URL « ohmniapv.fr » se révèle sous le bouton.
Scene 4 (4.4–6.0s): carte finale tenue (pas de fondu : la dernière image reste l'appel à l'action).
