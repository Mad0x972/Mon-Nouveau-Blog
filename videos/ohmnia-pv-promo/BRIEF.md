---
workflow: product-launch-video
flow: automation
storyboard: no
message: "Avec Ohmnia PV, l'intervention photovoltaïque se boucle sur place, rapport compris : fini les heures de paperasse."
destination: website
aspect: 1920x1080
language: fr
audience: "Installateurs photovoltaïques, sociétés de maintenance et exploitants de centrales (B2B)"
length: 60s
angle: "Problème → bascule → bénéfices → appel à l'action (timeline fournie par l'utilisateur)"
vo_mode: verbatim
narration: yes
captions: skipped
cta_url: ohmniapv.fr
---

## Intent

Publicité motion design de 60 secondes qui explique ce qu'est l'application Ohmnia PV, comment elle
fonctionne et à quoi elle sert, pour en faire la promotion auprès des professionnels du
photovoltaïque. Ohmnia PV rend les techniciens plus efficaces pendant les interventions de
maintenance de centrales photovoltaïques : saisie sur place (relevés contrôlés automatiquement,
anomalies détectées, photos, contrôles), puis rapport PDF professionnel signé par le client et envoyé
dans la foulée.

Messages à faire passer, classés par impact (verbatim utilisateur) :

1. Gain de temps : moins d'administratif après chaque intervention
2. Rapport pro immédiat : une preuve d'intervention propre à remettre au client
3. Traçabilité : historique par site/installation, rien ne se perd
4. Fiable sur le terrain : simple à utiliser, même sans aucun réseau
5. Équipe alignée : techniciens et bureau voient la même information grâce à l'export facile sur drive partagé, téléchargement ou envoi par mail
6. Prise en main rapide : pas de formation lourde

« Un seul message par scène. Une vidéo qui en dit trop n'en fait retenir aucun. »

## Assets

- capture/assets/app-*.png — captures d'écran de l'application (référence visuelle : écrans recréés en HTML/CSS dans la charte de l'app, pas collés tels quels).
- capture/assets/logo-app-icon.png — icône de l'app (Ω bleu, soleil orange, champ PV) ; recréée en SVG vectoriel pour l'animation.

## Customizations

- Voix off : Google TTS (Gemini) ou Flora demandés par l'utilisateur. Indisponibles dans cet environnement
  (pas de clé, hôtes bloqués) → piste voix laissée vide pour l'instant ; on régénère quand une clé
  `GEMINI_API_KEY` est disponible (nouvelle session) ou quand l'utilisateur fournit le fichier audio.
  La voix locale Kokoro a été refusée (« la voix ne va pas du tout »).
- Musique : bed original synthétisé localement (aucune bibliothèque musicale accessible), énergie
  montante, cuts calés sur la grille.
- Bruitages : synthétisés localement (whoosh, pop, coche, notification e-mail).
- Vidéo : uniquement HyperFrames (consigne utilisateur).

## Notes

- Timeline utilisateur conservée verbatim dans `user_script.txt` (0–5 s accroche, 5–15 s problème,
  15–22 s bascule, 22–30 s bénéfice 1, 30–38 s bénéfice 2, 38–46 s bénéfice 3, 46–54 s temps gagné,
  54–60 s CTA). Coquille corrigée : « 2 heure de paperasse » → « 2 heures de paperasse ».
- Site ohmniapv.fr (et ohmnia.fr) introuvables en DNS au 15/10/2026 → pas de capture web ; la charte
  vient des captures de l'app. URL du CTA : ohmniapv.fr (choix par défaut, à confirmer).
- Format, URL et rendu : questions posées, non répondues → défauts recommandés appliqués (16:9,
  ohmniapv.fr, rendu direct).
- Données affichées : uniquement des données de démo cohérentes avec les captures (Maison Durand,
  Ferme du Moulin…), aucune donnée client réelle.
