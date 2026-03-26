# Script de Demo - Soutenance SECOMO

## Projet SECOMO — Serre Connectee Modulaire | Innov 2026

**Duree estimee de la demo : 8-12 minutes**

---

## ACCROCHE — Le probleme (30 secondes)

> *Avant d'ouvrir l'app, parler face au jury/public :*

**Toi :**
« Imaginez Marie, une enseignante dans un college a Paris. Son etablissement a installe une serre pedagogique sur le toit pour que les eleves apprennent le cycle de vie des plantes. Super initiative. Sauf que... le week-end, personne n'est la. Le lundi matin, les tomates sont dessechees, le basilic a brule au soleil, et les eleves sont decourages.

Le probleme, c'est pas le manque de volonte — c'est le manque de **visibilite** et de **reaction en temps reel**. C'est exactement ce que SECOMO resout. »

---

## ACTE 1 — La decouverte (Landing Page) ~1 min

> *Ouvrir l'app deployee dans le navigateur. On arrive sur la landing page.*

**Toi :**
« Voici SECOMO — la Serre Connectee Modulaire. C'est un systeme IoT complet : des capteurs physiques ESP32 dans la serre, un backend intelligent, et cette interface web accessible depuis n'importe quel smartphone ou ordinateur. »

### Actions a montrer :
1. **Scroller lentement** pour montrer la landing page
2. **Pointer les 4 benefices** : « Suivi temps reel, Automation, Profils plantes, Alertes intelligentes — ce sont les 4 piliers du systeme. »
3. **Montrer la section "Comment ca marche"** avec les 4 etapes : « On branche le module, on choisit sa culture, SECOMO fait le reste, et on consulte tout depuis une seule interface. »
4. **Montrer l'apercu du dashboard** integre dans la landing : « Voila a quoi ressemble le monitoring en action — mais plutot que de vous le decrire, montrons-le en vrai. »

**Transition :**
« Revenons a Marie. Elle vient de decouvrir SECOMO. Elle va creer son compte. »

---

## ACTE 2 — L'inscription / connexion ~1 min

> *Cliquer sur "Creer un compte" ou "Demarrer maintenant"*

**Toi :**
« L'inscription est simple : prenom, nom, email, mot de passe. On accepte les conditions d'utilisation du POC... »

### Actions a montrer :
1. **Cliquer sur "Creer un compte"** (bouton vert en haut a droite ou "Demarrer maintenant")
2. **Montrer le formulaire** : « C'est volontairement epure. Prenom, nom, email, mot de passe. »
3. **Montrer le lien "Conditions generales"** : « On a meme les CGU du POC — tout est transparent. »
4. **Se connecter** (utiliser un compte deja cree ou le compte test `test@secomo.io` / `Test1234!` si le backend est up, sinon creer un compte rapidement)
5. **Accepter les cookies** si le bandeau apparait

**Transition :**
« Marie est connectee. Elle arrive directement sur son tableau de bord. C'est la que la magie commence. »

---

## ACTE 3 — Le Dashboard : le coeur du systeme ~3 min

> *On est maintenant dans le dashboard principal*

**Toi :**
« Voici le coeur de SECOMO. A gauche, la barre de navigation avec toutes les sections. En haut, la station selectionnee — ici "Serre Principale" — et le toggle Manuel/Auto. »

### 3.1 — Les capteurs en temps reel

**Actions a montrer :**
1. **Pointer les cartes de capteurs** : « Chaque carte affiche une mesure en temps reel : la temperature de l'air, l'humidite du sol, la luminosite, et le pH du sol. »
2. **Montrer les indicateurs de statut** (vert = OK, orange = attention, rouge = critique) : « Le systeme compare chaque mesure aux seuils du profil de plante assigne. Si la temperature depasse les seuils — le statut passe en alerte immediatement. »
3. **Montrer la plage cible** sous chaque capteur : « Ici par exemple, la cible d'humidite est entre 50 et 70%. On voit en un coup d'oeil si on est dans les normes. »

### 3.2 — Le reservoir d'eau et l'arrosage

**Actions a montrer :**
1. **Pointer la carte "Reservoir d'eau"** : « Marie voit directement le niveau du reservoir. Pas besoin d'aller verifier physiquement. »
2. **Montrer la section "Arrosage Manuel"** : « En mode Manuel, Marie peut declencher un arrosage directement depuis son telephone. Elle regle la duree avec le slider, et clique sur "Demarrer arrosage". »
3. **Declencher un arrosage** (cliquer sur "Demarrer arrosage") : « Hop ! La commande part vers l'ESP32, la pompe se declenche. On voit le compteur defiler en temps reel. »
4. **Montrer le toggle Manuel/Auto** en haut : « Mais le vrai interet de SECOMO, c'est le mode Automatique. »
5. **Switcher en mode AUTO** : « En un clic, on passe en mode Auto. Maintenant, c'est le systeme qui decide quand arroser en fonction de l'humidite du sol. Marie peut partir en week-end tranquille. »

### 3.3 — L'historique et les graphiques

**Actions a montrer :**
1. **Scroller vers les graphiques** : « Ici, l'historique des mesures sur les dernieres heures. On voit l'evolution de la temperature, l'humidite, la lumiere... »
2. **Survoler un point** pour montrer le tooltip : « En survolant, on a le detail exact avec l'horodatage. C'est essentiel pour comprendre les tendances. »

### 3.4 — La meteo et les recommandations

**Actions a montrer :**
1. **Pointer le widget meteo** : « Le systeme integre aussi la meteo locale. Si une vague de chaleur arrive, SECOMO peut anticiper les besoins en eau. »
2. **Montrer les recommandations** en bas : « Et ici, des recommandations intelligentes. Par exemple : "L'humidite du sol est basse, un arrosage est recommande", ou "La temperature est au-dessus du seuil optimal". »

**Transition :**
« Mais Marie ne cultive pas qu'une seule plante. Elle a des tomates, du basilic, de la menthe... C'est la qu'intervient la gestion des profils de plantes. »

---

## ACTE 4 — Les Profils Plantes ~1.5 min

> *Cliquer sur "Mes Plantes" dans la sidebar*

**Toi :**
« SECOMO embarque une bibliotheque de plantes avec des seuils pre-configures. Mais Marie peut aussi creer ses propres profils. »

### Actions a montrer :
1. **Montrer la liste des plantes** : « Voici les profils disponibles — Basilic, Menthe, Tomate cerise... Chaque profil definit les seuils optimaux : temperature, humidite, pH, luminosite. »
2. **Cliquer sur une plante** pour voir les details : « Pour le Basilic par exemple, la temperature ideale est entre 20 et 30 degres, l'humidite sol entre 50 et 70%. »
3. **Montrer le bouton "Appliquer au bac selectionne"** : « En un clic, Marie associe ce profil a un de ses bacs. Les seuils d'alerte et d'automatisation s'ajustent automatiquement. »
4. **Creer une nouvelle plante** (cliquer sur "Nouvelle plante") : « Et si la plante n'existe pas dans la bibliotheque, Marie peut creer un profil personnalise avec ses propres seuils. Elle a la main complete. »

**Transition :**
« Revenons au scenario du week-end. Marie est partie vendredi soir. Samedi matin, la temperature monte en fleche dans la serre... »

---

## ACTE 5 — Les Alertes ~1 min

> *Cliquer sur "Alertes" dans la sidebar*

**Toi :**
« Quand un seuil est depasse, SECOMO genere une alerte immediatement. »

### Actions a montrer :
1. **Montrer la liste des alertes** : « Chaque alerte indique le capteur concerne, le bac, l'heure exacte, et le niveau de severite — Info, Avertissement, ou Critique. »
2. **Pointer les badges colores** : « Les alertes non lues ont un badge "NOUVEAU". Marie voit d'un coup d'oeil ce qui necessite son attention. »
3. **Montrer le badge dans la sidebar** : « Et meme depuis n'importe quelle page, le badge rouge sur l'icone Alertes indique le nombre d'alertes non lues. »
4. **Cliquer sur "Tout marquer lu"** : « Une fois qu'elle a pris connaissance des alertes, elle peut les marquer comme lues. »

**Transition :**
« Marie veut aussi voir l'historique de tout ce qui s'est passe pendant le week-end... »

---

## ACTE 6 — L'historique des activites ~30 sec

> *Cliquer sur "Activites" dans la sidebar*

**Toi :**
« La section Activites centralise l'historique complet des arrosages — qu'ils soient automatiques ou manuels. »

### Actions a montrer :
1. **Montrer la timeline** : « On voit chaque evenement : date, heure, duree, et si c'etait un arrosage auto ou manuel. »
2. **Pointer la distinction Auto/Manuel** : « Le badge vert "Automatique" ou bleu "Manuel" permet de distinguer les deux. Marie peut verifier que le systeme a bien arrose pendant son absence. »

**Transition :**
« Maintenant, imaginons que l'ecole de Marie a grandi. Elle a maintenant 3 serres avec plusieurs bacs chacune. Comment gerer ca ? »

---

## ACTE 7 — La Configuration ~1.5 min

> *Cliquer sur "Configuration" dans la sidebar*

**Toi :**
« La Configuration, c'est l'ecran d'administration. C'est ici qu'on organise tout. »

### Actions a montrer :
1. **Montrer les stations** : « Chaque station represente un lieu physique — une serre, un balcon, un toit. Ici, notre "Serre Principale". »
2. **Montrer la grille de bacs** : « A l'interieur d'une station, on a une grille visuelle. Chaque case peut accueillir un bac — un module ESP32 avec ses capteurs. »
3. **Montrer l'ajout d'un bac** (cliquer sur une case vide si possible) : « Pour ajouter un bac, on clique sur une case vide. On lui donne un nom, et on peut meme lui assigner une adresse MAC pour le provisionnement automatique de l'ESP32. »
4. **Montrer la cle API** d'un bac : « Chaque bac a sa propre cle API. C'est cette cle qu'on entre dans le firmware ESP32 pour que le module sache ou envoyer ses donnees. »
5. **Montrer le selecteur de station en haut** (dans le header) : « Et depuis n'importe quelle page, le selecteur en haut permet de basculer entre les stations. Marie surveille ses 3 serres depuis la meme interface. »

**Transition :**
« Enfin, chaque utilisateur peut personnaliser son experience... »

---

## ACTE 8 — Le Profil utilisateur ~30 sec

> *Cliquer sur "Mon Profil" dans la sidebar*

**Actions a montrer :**
1. **Montrer les preferences** : « Theme clair ou sombre, langue francais ou anglais, unite de temperature en Celsius ou Fahrenheit. »
2. **Switcher le theme** (passer en dark mode ou inversement) : « Un clic, et tout le dashboard change de theme. C'est le detail qui fait la difference pour les utilisateurs. »
3. **Montrer le changement de langue** (optionnel, si le temps le permet)

---

## CONCLUSION — Retour a l'histoire ~1 min

> *Revenir sur le Dashboard pour finir sur le visuel le plus impressionnant*

**Toi :**
« Revenons a Marie. Lundi matin, elle arrive au college. Elle ouvre SECOMO sur son telephone. Elle voit que :
- Le systeme a **arrose automatiquement** 3 fois ce week-end
- La **temperature** est restee dans les seuils grace a la ventilation
- Le **reservoir** est encore a 40% — il faudra le remplir cette semaine
- Aucune **alerte critique** — ses plantes vont bien

Les eleves retrouvent leurs tomates en pleine forme. Marie n'a rien eu a faire.

C'est ca, SECOMO : une serre qui prend soin d'elle-meme, et des utilisateurs qui gardent le controle. »

---

## ANTICIPER LES QUESTIONS DU JURY

### Q: « C'est un prototype, comment ca se connecte au vrai materiel ? »
> « L'ESP32 est un microcontroleur Wi-Fi. Notre firmware envoie les lectures des capteurs via HTTP au backend FastAPI. Le dashboard se met a jour en temps reel via WebSocket. En mode demo sans hardware, l'app simule les donnees pour que l'experience soit identique. »

### Q: « Pourquoi pas une app mobile native ? »
> « C'est une Progressive Web App responsive. Elle fonctionne deja parfaitement sur smartphone via le navigateur. Pour un POC, ca evite la complexite de publier sur les stores tout en offrant la meme experience. L'evolution vers une app native est possible. »

### Q: « Comment gerez-vous la securite ? »
> « Authentification par JWT avec access token + refresh token. Chaque ESP32 s'identifie avec une cle API unique. Les communications frontend-backend sont chiffrees via HTTPS. Les mots de passe sont hashes avec bcrypt. »

### Q: « L'arrosage automatique, comment ca fonctionne precisement ? »
> « Le moteur d'automatisation compare l'humidite du sol aux seuils du profil de plante. Si l'humidite descend sous le minimum, une commande d'arrosage est creee et envoyee a l'ESP32 qui active la pompe. Il y a un cooldown pour eviter le sur-arrosage, et une duree maximale parametrable. »

### Q: « Combien de bacs/stations ca supporte ? »
> « L'architecture est concue pour etre modulaire — d'ou le M de SECOMO. Un utilisateur peut creer autant de stations qu'il veut, avec une grille de bacs configurable. Chaque bac est un device ESP32 independant. La seule limite, c'est la capacite du serveur, mais pour un usage scolaire ou urbain, on est tres large. »

### Q: « Comment vous deployez l'application ? »
> « Le frontend est deploye sur GitHub Pages via une GitHub Action automatisee. Le backend tourne sur un serveur avec Docker (PostgreSQL + FastAPI/Uvicorn). Le firmware se flash sur l'ESP32 via PlatformIO. »

---

## CHECKLIST AVANT LA DEMO

- [ ] Ouvrir l'app dans le navigateur (de preference Chrome, en plein ecran)
- [ ] Verifier que le compte test fonctionne ou preparer un compte frais
- [ ] Avoir au moins une station avec 2-3 bacs configures et des plantes assignees
- [ ] Verifier que des donnees/alertes sont presentes (ou laisser la simulation tourner quelques minutes avant)
- [ ] Preparer un onglet de backup avec des screenshots si le reseau plante
- [ ] Tester le projecteur/ecran de presentation en amont
- [ ] Mettre le telephone en mode avion (pas de notifications parasites)

---

## TIMING RESUME

| Acte | Duree | Contenu |
|------|-------|---------|
| Accroche | 30s | Le probleme de Marie |
| Acte 1 | 1 min | Landing page |
| Acte 2 | 1 min | Inscription/connexion |
| Acte 3 | 3 min | Dashboard (capteurs, arrosage, graphiques, meteo) |
| Acte 4 | 1.5 min | Profils plantes |
| Acte 5 | 1 min | Alertes |
| Acte 6 | 30s | Historique activites |
| Acte 7 | 1.5 min | Configuration stations/bacs |
| Acte 8 | 30s | Profil utilisateur |
| Conclusion | 1 min | Retour a l'histoire de Marie |
| **Total** | **~10 min** | |

---

## TIPS PRESENTATION

1. **Ne lis pas le script mot pour mot** — utilise-le comme guide, parle naturellement
2. **Ralentis sur les clics** — le jury doit voir ce que tu fais, attends que la page charge
3. **Pointe avec la souris** ce que tu decris — guide le regard du public
4. **Si quelque chose plante**, ne panique pas : « L'app a un mode simulation integre justement pour ce cas — c'est une feature, pas un bug ! »
5. **Commence et finis par l'histoire de Marie** — ca donne un fil rouge memorable
6. **Regarde le jury**, pas l'ecran — tu connais ton app, montre ta confiance
