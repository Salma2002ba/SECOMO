# SECOMO — Notice d'utilisation

**Serre Connectée Modulaire**
Version 1.0

---

## Sommaire

1. [Présentation](#1-présentation)
2. [Première connexion](#2-première-connexion)
3. [Le dashboard](#3-le-dashboard)
4. [Les stations et les bacs](#4-les-stations-et-les-bacs)
5. [Les profils de plantes](#5-les-profils-de-plantes)
6. [L'arrosage](#6-larrosage)
7. [Les alertes](#7-les-alertes)
8. [Les paramètres du compte](#8-les-paramètres-du-compte)
9. [Questions fréquentes](#9-questions-fréquentes)

---

## 1. Présentation

SECOMO est un système de surveillance et de pilotage de serre connectée. Il se compose d'un ou plusieurs modules ESP32 placés dans vos bacs, et d'une application web accessible depuis n'importe quel navigateur sur votre réseau local.

Chaque module mesure en continu :

- la **température** et l'**humidité de l'air**
- l'**humidité du sol**
- l'**intensité lumineuse**
- le **pH du sol**
- le **niveau d'eau** dans le réservoir
- le **niveau de charge** de la batterie

Ces données sont envoyées en temps réel à l'application, qui peut déclencher des actions automatiques (arrosage, ventilation, éclairage) ou vous alerter si quelque chose sort des normes définies pour vos plantes.

---

## 2. Première connexion

### Créer un compte

Ouvrez l'application dans votre navigateur. Sur la page d'accueil, cliquez sur **Commencer** ou **Se connecter**, puis sur **Créer un compte**.

Renseignez votre prénom, nom, adresse e-mail et un mot de passe. Une fois le compte créé, vous êtes redirigé directement vers le dashboard.

### Ajouter un appareil

Avant de voir des données, il faut associer au moins un module ESP32 à votre compte.

1. Dans le menu, allez dans **Configuration**.
2. Créez une **station** (un groupe de bacs, par exemple "Serre principale").
3. Dans cette station, cliquez sur **Ajouter un bac**.
4. Un **code API** est généré automatiquement. Copiez-le.
5. Ce code doit être renseigné dans le fichier de configuration du module ESP32 (`config.h`) par la personne qui installe le matériel.

Une fois le module flashé et alimenté, les données apparaissent dans l'application en quelques secondes.

---

## 3. Le dashboard

Le dashboard est la vue principale de l'application. Il regroupe toutes les informations en temps réel sur vos bacs.

### Les cartes capteurs

Chaque bac affiche ses mesures sous forme de cartes :

| Carte | Ce qu'elle affiche |
|---|---|
| Température | Température de l'air en °C (ou °F selon vos préférences) |
| Humidité air | Taux d'humidité de l'air en % |
| Humidité sol | Taux d'eau dans la terre en % |
| Luminosité | Intensité lumineuse en % (100% = lumière vive en plein soleil) |
| pH sol | Acidité du sol (0 = très acide, 14 = très basique, 7 = neutre) |
| Réservoir | Niveau d'eau restant dans le réservoir en % |
| Batterie | Niveau de charge du module en % |

La couleur de chaque carte indique si la valeur est dans les normes de la plante assignée au bac :
- **Vert** : dans les seuils normaux
- **Orange** : valeur basse ou haute, attention requise
- **Rouge** : valeur critique, action nécessaire

Si aucune plante n'est assignée au bac, les cartes s'affichent sans indicateur de seuil.

### Les graphiques historiques

En bas du dashboard, un graphique affiche l'évolution des mesures dans le temps. Vous pouvez choisir la plage à afficher (dernière heure, dernières 24h, dernière semaine) et sélectionner les capteurs à visualiser.

### Les recommandations

À droite de chaque bac, un encadré **Recommandations** indique en langage clair ce qui ne va pas et ce qu'il faut faire. Par exemple :

> *Sol trop humide (72%) : suspendez l'arrosage.*
> *Réservoir bas (12%) : remplissez-le prochainement.*

Ces recommandations sont générées automatiquement à partir des seuils de la plante assignée.

---

## 4. Les stations et les bacs

### Qu'est-ce qu'une station ?

Une station est un groupe de bacs situés au même endroit (une serre, un balcon, un couloir...). Vous pouvez avoir plusieurs stations, chacune avec ses propres bacs organisés en grille.

### Créer une station

Allez dans **Configuration** → **Nouvelle Station**. Donnez-lui un nom et un emplacement (facultatif). La grille de la station s'affiche ensuite, vide, prête à recevoir des bacs.

### Gérer les bacs sur la grille

Dans la vue de configuration d'une station, chaque case de la grille représente un emplacement physique. Vous pouvez :

- **Déplacer un bac** en le faisant glisser sur la grille
- **Interchanger deux bacs** en cliquant sur l'un, puis sur l'autre
- **Accéder aux paramètres d'un bac** en survolant sa case et en cliquant sur l'icône paramètres

### Paramètres d'un bac

Depuis l'icône paramètres d'un bac, vous pouvez configurer :

- **La plante assignée** : le profil de plante utilisé pour les seuils et les recommandations
- **L'arrosage automatique** : activer ou désactiver le déclenchement automatique
- **La taille du bac** : petit, moyen ou grand
- **La fréquence de mesure** : intervalle entre deux lectures des capteurs

---

## 5. Les profils de plantes

Un profil de plante définit les conditions idéales de culture : humidité du sol, plage de température, lumière minimale et pH. Ces valeurs servent de référence pour colorier les cartes capteurs et générer les alertes.

### Parcourir le catalogue

L'application intègre un catalogue de plus de 5 500 espèces végétales. Quand vous créez ou modifiez un profil, tapez le nom de votre plante dans la barre de recherche : les seuils sont pré-remplis automatiquement. Vous pouvez ensuite les ajuster à votre convenance.

### Créer un profil manuellement

Allez dans **Mes Plantes** → **Nouvelle plante**. Renseignez :

- **Nom** de la plante
- **Humidité sol** : fourchette min/max en % (la plupart des plantes poussent bien entre 40% et 70%)
- **Température** : fourchette min/max en °C
- **Lumière minimum** : seuil en % en dessous duquel l'éclairage artificiel peut s'activer
- **pH** : fourchette min/max (potager classique : 6.0–7.0)
- **Notes** : champ libre pour vos conseils de culture

### Assigner un profil à un bac

Depuis **Mes Plantes**, sélectionnez un profil et cliquez sur **Appliquer au bac sélectionné**. Vous pouvez aussi le faire depuis les paramètres du bac dans la vue Configuration.

Un même profil peut être assigné à plusieurs bacs. Si vous modifiez le profil, les changements s'appliquent à tous les bacs liés.

### Supprimer un profil

Cliquez sur **Supprimer** depuis la fiche du profil. Attention : les bacs liés à ce profil perdront leurs seuils et n'afficheront plus d'indicateurs colorés ni de recommandations jusqu'à ce qu'un nouveau profil leur soit assigné.

---

## 6. L'arrosage

### Arrosage manuel

Sur le dashboard, chaque bac dispose d'un bouton **Arroser**. Cliquez dessus pour déclencher immédiatement la pompe d'arrosage. Un curseur vous permet de choisir la durée (de quelques secondes à deux minutes).

L'arrosage s'arrête automatiquement à la fin de la durée choisie. Vous pouvez aussi l'interrompre manuellement en cliquant sur **Arrêter l'arrosage**.

> Si le réservoir est vide (niveau inférieur à 5%), l'arrosage est bloqué pour protéger la pompe.

### Arrosage automatique

Quand l'arrosage automatique est activé pour un bac (depuis ses paramètres), le système déclenche la pompe dès que l'humidité du sol descend en dessous du seuil minimal défini dans le profil de la plante.

Un délai de 30 minutes est respecté entre deux arrosages automatiques pour laisser le temps à la terre d'absorber l'eau.

### Historique des arrosages

La section **Activité** du dashboard liste tous les événements d'arrosage passés, avec pour chacun :
- la date et l'heure
- la durée
- le mode (manuel ou automatique)
- l'humidité du sol au moment du déclenchement

---

## 7. Les alertes

### Qu'est-ce qui déclenche une alerte ?

Une alerte est créée automatiquement dès qu'une mesure dépasse les seuils du profil de plante assigné au bac. Il existe trois niveaux :

| Niveau | Signification |
|---|---|
| Info | Valeur légèrement hors norme, à surveiller |
| Avertissement | Valeur notable, intervention conseillée |
| Critique | Valeur dangereuse pour la plante, action requise |

Les alertes apparaissent dans la section **Alertes** du menu, et un indicateur numérique est affiché dans la barre de navigation tant qu'il reste des alertes non lues.

### Gérer les alertes

- **Marquer une alerte comme lue** : cliquez sur l'alerte, elle passe en grisé
- **Tout marquer comme lu** : bouton en haut de la liste
- **Supprimer une alerte** : icône corbeille sur chaque alerte
- **Tout effacer** : supprime toutes les alertes de la liste

### Lien avec le dashboard

Chaque alerte comporte un bouton **Voir le dashboard** qui vous amène directement au bac concerné.

---

## 8. Les paramètres du compte

Accessible depuis **Mon Profil** dans le menu.

### Informations personnelles

Modifiez votre prénom, nom et adresse e-mail. Un changement d'e-mail nécessite votre mot de passe pour être confirmé.

### Préférences d'affichage

| Réglage | Options disponibles |
|---|---|
| Thème | Clair (Tech Calm) / Sombre (Dark Soft) |
| Langue | Français / English |
| Unité de température | Celsius / Fahrenheit |
| Fuseau horaire | Tous les fuseaux UTC |

Ces préférences sont enregistrées sur votre compte et se synchronisent sur tous les appareils où vous vous connectez.

---

## 9. Questions fréquentes

**Les données ne se mettent plus à jour sur le dashboard.**

Vérifiez que le module ESP32 est bien alimenté et que le voyant WiFi clignote normalement. Si le problème persiste, vérifiez que la machine qui héberge le backend est bien allumée et accessible sur le réseau.

---

**Le bac affiche "Hors ligne".**

Cela signifie que le backend n'a reçu aucune donnée du module depuis plus de quelques minutes. Causes possibles : coupure WiFi, batterie déchargée, module débranché. Le statut repasse en ligne automatiquement dès que la connexion est rétablie.

---

**Mes cartes capteurs sont grises sans indicateur coloré.**

Aucun profil de plante n'est assigné à ce bac. Allez dans **Mes Plantes**, sélectionnez un profil et appliquez-le au bac. Les indicateurs apparaîtront immédiatement.

---

**Je veux suivre plusieurs espèces dans la même serre.**

Créez un profil de plante pour chaque espèce, puis assignez chaque profil au bac correspondant. Chaque bac est géré indépendamment avec ses propres seuils.

---

**Le niveau du réservoir descend très vite.**

Si l'arrosage automatique est activé et que l'humidité du sol reste constamment basse, le système arrose fréquemment. Deux pistes : vérifier que le capteur d'humidité sol est bien planté dans la terre (et pas dans l'air), ou ajuster le seuil minimal dans le profil de plante.

---

**J'ai oublié d'assigner une plante avant de lancer l'arrosage automatique.**

Sans profil de plante, l'arrosage automatique ne se déclenche pas (aucun seuil de référence). Assignez un profil au bac et activez l'option depuis ses paramètres.

---

**Comment savoir si un arrosage automatique a eu lieu ?**

Consultez la section **Activité** du dashboard. Tous les événements d'arrosage y sont listés, qu'ils aient été déclenchés manuellement ou automatiquement.

---

*Notice SECOMO v1.0 — Projet inter-école*
