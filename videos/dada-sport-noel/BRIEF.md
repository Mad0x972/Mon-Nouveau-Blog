---
workflow: general-video
flow: automation
storyboard: no
message: "La magie de Noël, c'est ce qu'on partage avec un cheval — Dada Sport garde les cavaliers au chaud."
destination: youtube
aspect: 1920x1080
language: fr
audience: cavalières et cavaliers, clientèle Dada Sport Paris
length: 70s
angle: conte de Noël mélancolique et légèrement fantastique, 100 % dessiné
---

## Intent

Court métrage de Noël pour la marque Dada Sport Paris (https://dadasport.com/).
Ambiance « un peu mélancolique », style « du dessin, que du dessin », légèrement
fantastique (magie de Noël). Il doit y avoir des chevaux, et le rendu doit donner
l'impression d'avoir été réalisé par un studio. Voix off : « une voix de Père Noël
bien grave ». Produits du site choisis librement par nous.

## Assets

- Planche d'inspiration fournie (non embarquée dans le projet) : forêt de bouleaux
  baignée d'une lumière dorée avec anneau de particules (style Klaus) ; étoile géante
  lumineuse dans une forêt turquoise près d'une cabane ; sapin rose pailleté au bord
  d'un lac gelé avec des cerfs (carte vintage).

## Customizations

- Produits mis en avant (noms réels du catalogue) : doudoune imperméable **Tinka**
  (marine), pantalon d'équitation **Giovani Winter** doublé polaire, veste de concours
  **New Tzara** (coloris Orage). Dessinés, pas photographiés.
- Voix off FR générée en local (Kokoro, mélange des voix « santa ») puis abaissée
  et réchauffée pour une voix grave de Père Noël.
- Musique originale synthétisée (boîte à musique, cordes, piano) + ambiance (vent,
  pas dans la neige, grelots, scintillements).

## Notes

- dadasport.com n'est pas joignable depuis l'environnement : produits identifiés via
  recherche web (pages produit dadasport.com et revendeurs).
- Pas de logo officiel disponible : la marque est composée typographiquement
  (DADA SPORT · PARIS) — à remplacer par le logo officiel si fourni.
- Bande-son régénérable : `audio-src/build_audio.py <dossier_blocs_voix> <sortie>`
  (blocs de voix Kokoro « em_santa 0.4 / pm_santa 0.2 / am_onyx 0.4 », vitesse 0.78,
  puis `rubberband=pitch=0.83:formant=preserved`), exports MP3 dans `assets/audio/`.
