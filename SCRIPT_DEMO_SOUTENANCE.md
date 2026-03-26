# Script de Demo — Soutenance SECOMO

## Projet SECOMO — Serre Connectee Modulaire | Innov 2026

**Duree estimee de la demo : 8-12 minutes**
**Accessoire sur le stand : un pot de menthe marocaine fraiche**

---

## AVANT DE COMMENCER — Mise en scene

> *Le pot de menthe marocaine est pose bien visible sur la table du stand, a cote de l'ecran de demo. Si possible, froisser legerement une feuille avant le passage du jury pour que l'odeur se diffuse.*

---

## ACCROCHE — Le pont entre le reel et le numerique (45 secondes)

> *Debout a cote du pot de menthe. Ne pas encore ouvrir l'app. Regard vers le jury.*

**Toi :**

« Vous sentez cette odeur ? *(geste vers le pot)* C'est de la menthe marocaine. Elle est vivante, elle pousse, elle a besoin d'eau, de lumiere, d'une bonne temperature.

Maintenant, imaginez Marie, une enseignante en college. Son etablissement a installe une serre pedagogique sur le toit. Super projet. Les eleves adorent. Sauf que... le week-end, personne n'est la. Lundi matin, la menthe est toute molle, les tomates ont soif, et les gamins sont depites.

Le probleme c'est pas la volonte — c'est que personne ne surveille les plantes 24h/24. Et c'est exactement pour ca qu'on a cree SECOMO. »

> *Poser la main pres du pot de menthe*

« Cette menthe-la, sur cette table, elle n'a pas de capteur. Mais je vais vous montrer ce qui se passe quand on en met un. »

> *Se tourner vers l'ecran et ouvrir l'app*

---

## ACTE 1 — La vitrine (Landing Page) ~1 min

> *L'app s'ouvre sur la landing page*

**Toi :**
« SECOMO — Serre Connectee Modulaire. Un systeme IoT complet : des capteurs ESP32 dans la serre, un cerveau dans le cloud, et cette interface accessible depuis n'importe quel telephone. »

### Actions a montrer :
1. **Scroller doucement** en montrant la page
2. **Pointer les 4 benefices** : « Les 4 piliers : suivi en temps reel, arrosage automatise, profils de plantes — comme notre menthe — et alertes intelligentes. »
3. **S'arreter sur "Comment ca marche"** : « Quatre etapes : brancher le module, choisir la plante, laisser SECOMO agir, et consulter depuis n'importe ou. »
4. **Montrer l'apercu du dashboard** integre dans la landing : « Voila le genre de dashboard que Marie voit. Mais montrons ca en vrai. »

**Transition :**
« Marie decouvre SECOMO. Elle va creer son compte pour y connecter sa serre. »

---

## ACTE 2 — L'inscription / connexion ~1 min

> *Cliquer sur "Demarrer maintenant" ou "Creer un compte"*

**Toi :**
« L'inscription est volontairement simple — prenom, nom, email, mot de passe. Pas de friction. »

### Actions a montrer :
1. **Cliquer sur "Creer un compte"** (bouton vert)
2. **Montrer le formulaire** rapidement : « Prenom, nom, email, mot de passe — c'est tout. »
3. **Montrer le lien CGU** : « Les conditions d'utilisation du POC sont accessibles et transparentes. »
4. **Se connecter** (compte test `test@secomo.io` / `Test1234!` si backend up, sinon creer un compte — l'app bascule en mode simulation automatiquement)
5. **Accepter les cookies** si bandeau affiche

**Transition :**
« Marie est connectee. Elle arrive sur son dashboard. Et c'est la que ca devient concret. »

---

## ACTE 3 — Le Dashboard — la menthe sous surveillance ~3 min

> *On est sur le dashboard. Selectionner le bac qui a la menthe (Bac Aromatiques / Bac Potager Cuisine).*

**Toi :**
« Voici le coeur de SECOMO. A gauche la navigation, en haut la station selectionnee et le mode Manuel ou Auto. Et au centre... les donnees en direct de notre menthe. »

> *Pointer le pot de menthe physique sur la table, puis l'ecran*

« Imaginez que ce pot *(geste vers la menthe)* a un petit module ESP32 plante dedans. Voila ce qu'on verrait. »

### 3.1 — Les capteurs en temps reel — le check-up de la menthe

**Actions a montrer :**
1. **Pointer les cartes capteurs une par une** :
   - « **Temperature de l'air** — la menthe marocaine aime entre 12 et 25 degres. La, on est a [lire la valeur]. Le statut est vert, on est dans les clous. »
   - « **Humidite du sol** — c'est LE parametre crucial pour la menthe. Elle aime avoir les pieds bien mouilles, entre 65 et 90%. La, on voit [lire la valeur]... et le statut indique que c'est un peu bas. »
   - « **Luminosite** — la menthe est tolerante, elle n'a pas besoin de plein soleil. »
   - « **pH du sol** — entre 6 et 7 idealement. On est a [lire la valeur], c'est parfait. »
2. **Insister sur les indicateurs visuels** : « Vert c'est OK, orange c'est attention, rouge c'est critique. En un coup d'oeil, Marie sait si sa menthe va bien — sans se deplacer. »

### 3.2 — Le reservoir et l'arrosage — on sauve la menthe

**Actions a montrer :**
1. **Pointer la carte "Reservoir d'eau"** : « Le niveau du reservoir, visible en direct. Pas besoin d'aller soulever le couvercle. »
2. **Montrer la section "Arrosage Manuel"** : « L'humidite du sol est un peu basse pour notre menthe. En mode Manuel, Marie peut reagir tout de suite. »
3. **Declencher un arrosage** (cliquer "Demarrer arrosage") :

   > *Geste theatral vers le pot de menthe sur la table :*

   « Et hop ! La commande part vers l'ESP32, la pompe se declenche. Notre menthe est arrosee. *(sourire)* Celle-la par contre *(montrer le pot)*, il va falloir que je le fasse a la main. »

   *(petit moment de legerete — le jury sourit)*

4. **Montrer le toggle Manuel/Auto** : « Mais le vrai pouvoir de SECOMO, c'est le mode Auto. »
5. **Switcher en AUTO** : « Un clic. Maintenant, le systeme surveille l'humidite en continu. Des que ca descend sous 65% pour la menthe, il arrose automatiquement. Marie part en week-end l'esprit tranquille. »

### 3.3 — L'historique et les graphiques

**Actions a montrer :**
1. **Scroller vers les graphiques** : « Ici, l'evolution des mesures sur les dernieres heures. On voit les courbes de temperature, d'humidite, de lumiere... »
2. **Survoler un point** : « En survolant, le detail exact avec l'horodatage. C'est essentiel pour comprendre les tendances : est-ce que la temperature monte l'apres-midi ? Est-ce que le sol seche trop vite ? Les donnees racontent l'histoire de la plante. »

### 3.4 — Meteo et recommandations intelligentes

**Actions a montrer :**
1. **Pointer le widget meteo** : « SECOMO integre la meteo locale. S'il fait 35 degres demain, le systeme sait que l'evaporation va augmenter et peut anticiper. »
2. **Montrer les recommandations** : « Et ici, des recommandations adaptees au profil de la plante. Par exemple, si l'humidite du sol est trop basse pour la menthe, on voit : "Un arrosage est recommande". C'est comme un assistant jardinier. »

**Transition :**
« Maintenant, Marie ne cultive pas que de la menthe. Elle a aussi du basilic et des tomates cerises. Chaque plante a des besoins differents. C'est la que les profils interviennent. »

---

## ACTE 4 — Les Profils Plantes — personnaliser chaque culture ~1.5 min

> *Cliquer sur "Mes Plantes" dans la sidebar*

**Toi :**
« SECOMO embarque une bibliotheque de profils de plantes avec des seuils scientifiques pre-configures. »

### Actions a montrer :
1. **Montrer la liste** : « Basilic Grand Vert, Tomates Cerises, Menthe Poivree — chaque profil definit les seuils optimaux pour cette espece. »
2. **Cliquer sur le profil Menthe Poivree** :
   « Voila notre menthe. Humidite sol : 65 a 90%. Temperature : 12 a 25 degres. pH : 6 a 7. Et cette note : "Tres robuste, prefere un sol toujours humide." C'est exactement ca — la menthe marocaine qui est la sur la table, elle a les memes besoins. »

   > *Geste vers le pot*

3. **Montrer "Appliquer au bac selectionne"** : « Un clic, et ces seuils sont appliques au bac. Les alertes et l'automatisation s'ajustent instantanement. »
4. **Montrer le bouton "Nouvelle plante"** : « Et si Marie cultive quelque chose d'exotique qui n'est pas dans la bibliotheque — elle cree son propre profil avec ses seuils. Ou elle peut chercher dans le catalogue : on a des centaines d'especes referencees. La menthe marocaine ? On tape "menthe", et on trouve toutes les varietes de Mentha. »

**Transition :**
« Vendredi soir. Marie active le mode Auto sur tous ses bacs et rentre chez elle. Samedi, 14h, grosse chaleur. La temperature dans la serre monte a 30 degres... »

---

## ACTE 5 — Les Alertes — le gardien vigilant ~1 min

> *Cliquer sur "Alertes" dans la sidebar*

**Toi :**
« 30 degres dans la serre. Pour notre menthe qui supporte max 25, c'est une alerte critique. SECOMO reagit immediatement. »

### Actions a montrer :
1. **Montrer la liste des alertes** : « Chaque alerte indique : quel capteur, quel bac, quelle heure, et le niveau — Info, Avertissement ou Critique. »
2. **Pointer une alerte liee a la temperature ou l'humidite** : « La, on voit clairement : temperature trop haute pour la menthe, ou humidite sol trop basse. L'alerte est generee en temps reel. »
3. **Montrer le badge rouge dans la sidebar** : « Et depuis n'importe quelle page, ce badge rouge rappelle a Marie qu'il y a des alertes non lues. »
4. **Cliquer "Tout marquer lu"** : « Une fois traitees, on les marque comme lues. »

**Transition :**
« Pendant ce temps, le mode Auto a fait son travail... »

---

## ACTE 6 — L'historique des activites — la preuve que ca marche ~30 sec

> *Cliquer sur "Activites"*

**Toi :**
« Voici le journal de bord. Tout ce que SECOMO a fait automatiquement pendant l'absence de Marie. »

### Actions a montrer :
1. **Montrer la liste** : « Chaque arrosage est trace : heure, duree, et la mention "Automatique" en vert ou "Manuel" en bleu. »
2. **Pointer un arrosage auto** : « Ici par exemple, samedi a 14h32, arrosage automatique de 25 secondes sur le bac de menthe. Le systeme a detecte que l'humidite avait chute sous 65% et il a agi. Marie n'a rien eu a faire. »

**Transition :**
« Mais l'ecole de Marie grandit. Elle a maintenant trois serres. Comment gerer tout ca ? »

---

## ACTE 7 — La Configuration — le M de Modulaire ~1.5 min

> *Cliquer sur "Configuration"*

**Toi :**
« Le M de SECOMO, c'est Modulaire. Et c'est ici qu'on le voit. »

### Actions a montrer :
1. **Montrer les stations** : « Chaque station est un lieu physique. "Serre Principale", "Toit nord", "Classe de SVT"... Marie peut en creer autant qu'elle veut. »
2. **Montrer la grille de bacs** : « A l'interieur, une grille visuelle. Chaque case, c'est un bac physique avec son module ESP32. On voit la position exacte dans la serre — comme un plan. »
3. **Montrer l'ajout d'un bac** : « Pour ajouter un bac, on clique sur une case vide, on lui donne un nom — par exemple "Bac Menthe Marocaine" *(clin d'oeil)* — et on peut scanner un QR code ou entrer l'adresse MAC du module. »
4. **Montrer la cle API** : « Chaque bac a sa cle API unique. C'est cette cle qu'on flash dans le firmware de l'ESP32. A partir de la, les donnees remontent automatiquement. »
5. **Basculer entre stations** via le selecteur en haut : « Et depuis n'importe quelle page, on change de station en un clic. Marie gere ses 3 serres depuis le meme ecran. »

**Transition :**
« Dernier point : chaque utilisateur peut personnaliser son experience. »

---

## ACTE 8 — Le Profil — les petits details qui comptent ~30 sec

> *Cliquer sur "Mon Profil"*

### Actions a montrer :
1. **Montrer les preferences** : « Theme clair ou sombre, francais ou anglais, Celsius ou Fahrenheit. »
2. **Switcher le theme** : « Un clic... *(basculer dark/light)* ...et toute l'interface s'adapte. C'est le genre de detail qui montre que le produit est pense pour l'utilisateur, pas juste pour la technique. »

---

## CONCLUSION — Le retour de Marie (et de la menthe) ~1 min

> *Revenir sur le Dashboard, avec le bac de menthe selectionne. Poser la main pres du pot physique.*

**Toi :**
« Lundi matin. Marie arrive au college. Elle ouvre SECOMO sur son telephone.

Elle voit que :
- Le systeme a **arrose automatiquement** 3 fois ce week-end
- La **temperature** a depasse les seuils samedi, mais la ventilation a compense
- Le **reservoir** est encore a 40% — il faudra le remplir cette semaine
- Aucune **alerte critique** en cours — tout est rentre dans l'ordre

Les eleves arrivent en classe. Ils retrouvent leur menthe en pleine forme. *(Geste vers le pot sur la table)* Exactement comme celle-ci.

*(Pause)*

SECOMO, c'est une serre qui prend soin d'elle-meme. Et des utilisateurs qui gardent le controle — qu'ils soient devant l'ecran ou a 100 km de la. »

*(Fin de la demo — laisser un silence de 2-3 secondes, puis :)*

« Je suis disponible pour vos questions. Et si vous voulez sentir la menthe de plus pres, n'hesitez pas. »

---

## ANTICIPER LES QUESTIONS DU JURY

### Q: « C'est un prototype — comment ca se connecte au vrai materiel ? »
> « L'ESP32 est un microcontroleur Wi-Fi a 5 euros. Notre firmware C++ lit les capteurs (DHT22, sonde capacitive, photoresistance, sonde pH) et envoie les mesures en HTTP au backend FastAPI. Le dashboard se met a jour en temps reel par WebSocket. En demo sans hardware, l'app genere des donnees simulees pour que l'experience soit identique — c'est ce que vous avez vu. »

### Q: « Pourquoi pas une app mobile native ? »
> « C'est une webapp responsive — elle fonctionne deja tres bien sur smartphone via le navigateur. Pour un POC, ca evite la complexite des stores iOS/Android tout en offrant la meme experience. L'evolution vers du natif avec React Native est possible, on partage deja le meme backend. »

### Q: « Comment gerez-vous la securite ? »
> « Authentification JWT avec access token + refresh token. Chaque ESP32 a une cle API unique. HTTPS en production. Mots de passe hashes en bcrypt. Les donnees d'un utilisateur ne sont jamais visibles par un autre. »

### Q: « L'arrosage automatique, comment ca decide ? »
> « Le moteur d'automatisation compare en continu l'humidite du sol au seuil minimal du profil de plante. Pour la menthe, c'est 65%. Des que ca descend en dessous, une commande de pompe est creee avec une duree calculee. Un cooldown empeche le sur-arrosage. Tout est logged et visible dans l'historique. »

### Q: « Combien de bacs/stations ca supporte ? »
> « L'architecture est modulaire par design — d'ou le M de SECOMO. Pas de limite hard-coded cote app. Cote serveur, un PostgreSQL standard supporte largement des centaines de devices. Pour un usage scolaire ou urbain, on est tres large. »

### Q: « Comment vous deployez ? »
> « Frontend deploye sur GitHub Pages via GitHub Actions automatisees. Backend en Docker (PostgreSQL + FastAPI/Uvicorn). Le firmware se flash sur l'ESP32 via PlatformIO. Le tout est versionne sur GitHub. »

### Q: « Pourquoi la menthe marocaine ? » *(si quelqu'un demande)*
> « C'est un choix concret et sensoriel. On voulait que la demo ne soit pas juste un ecran — qu'on puisse toucher et sentir la plante qu'on monitore numeriquement. La menthe marocaine est aussi presente dans notre bibliotheque de plantes avec des seuils reels : 12-25 degres, humidite sol 65-90%, pH 6-7. C'est la preuve que SECOMO n'est pas abstrait — il sert a garder vivante exactement ce type de plante. »

---

## CHECKLIST AVANT LA DEMO

- [ ] Pot de menthe marocaine frais et beau sur la table (froisser une feuille pour l'odeur avant le passage)
- [ ] App ouverte dans le navigateur (Chrome, plein ecran)
- [ ] Compte test fonctionnel ou compte frais prepare
- [ ] Au moins une station avec bacs + menthe assignee visible
- [ ] Laisser la simulation tourner 2-3 min avant pour generer des donnees et alertes
- [ ] Onglet backup avec screenshots si le reseau plante
- [ ] Tester le projecteur/ecran en amont
- [ ] Telephone en mode avion

---

## TIMING RESUME

| Acte | Duree | Contenu |
|------|-------|---------|
| Mise en scene | — | Menthe sur la table, feuille froissee |
| Accroche | 45s | L'odeur de la menthe + le probleme de Marie |
| Acte 1 | 1 min | Landing page |
| Acte 2 | 1 min | Inscription / connexion |
| Acte 3 | 3 min | Dashboard — la menthe sous surveillance (capteurs, arrosage, graphiques, meteo) |
| Acte 4 | 1.5 min | Profils plantes — les seuils de la menthe |
| Acte 5 | 1 min | Alertes — 30 degres dans la serre |
| Acte 6 | 30s | Historique activites — arrosage auto samedi |
| Acte 7 | 1.5 min | Configuration — le M de Modulaire |
| Acte 8 | 30s | Profil utilisateur |
| Conclusion | 1 min | Retour a Marie + la menthe sur la table |
| **Total** | **~10 min** | |

---

## TIPS PRESENTATION

1. **La menthe est ton ancrage** — chaque fois que tu parles de donnees "abstraites" sur l'ecran, un geste vers le pot rend ca tangible
2. **Ne lis pas le script** — utilise-le comme guide, parle avec tes mots
3. **Ralentis sur les clics** — le jury doit voir ce que tu fais
4. **Si l'app plante** : « L'app a un mode simulation integre justement pour les situations ou le reseau est instable. C'est une feature, pas un bug. »
5. **L'humour avec la menthe** est ton allie — le moment "celle-la il faut que je l'arrose a la main" est un moment de decompression pour le jury
6. **Commence par l'odeur, finis par l'odeur** — c'est memoriel. Le jury se souviendra de toi comme "le/la projet avec la menthe"
7. **Regarde le jury**, pas l'ecran — tu connais ton app
8. **La derniere phrase** ("si vous voulez sentir la menthe, n'hesitez pas") cree de la convivialite et invite a l'echange
