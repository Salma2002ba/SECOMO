# Déploiement sur GitHub Pages (secomo)

## Pour avoir l’URL : `https://<ton-username>.github.io/secomo/`

Le dépôt GitHub doit s’appeler **secomo**.

### Option A : Nouveau dépôt secomo

1. Sur GitHub : **New repository** → nom : `secomo`.
2. Dans ton projet en local :
   ```bash
   git remote add pages https://github.com/Salma2002ba/secomo.git
   git push pages arthur
   ```
   (Ou remplace `Salma2002ba` par ton username GitHub.)

### Option B : Renommer le dépôt existant

1. Sur GitHub : **Settings** du dépôt → **General** → **Repository name** → `secomo` → **Rename**.

### Activer GitHub Pages

1. Sur le dépôt **secomo** : **Settings** → **Pages**.
2. **Source** : **GitHub Actions** (pas “Deploy from a branch”).
3. Enregistre.

À chaque push sur la branche **arthur**, le workflow déploie le frontend.  
L’adresse du site sera : **https://Salma2002ba.github.io/secomo/** (en remplaçant par ton username si besoin).
