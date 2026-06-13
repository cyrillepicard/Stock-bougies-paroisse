# 🕯️ Guide de déploiement — Gestion des Bougies Paroisse

Ce guide vous accompagne pas à pas pour mettre l'application en ligne.
**Niveau requis : débutant.** Chaque étape est expliquée simplement.

---

## Étape 1 — Créer un compte Supabase (base de données)

1. Rendez-vous sur **https://supabase.com**
2. Cliquez sur **"Start your project"** → **"Sign up"**
3. Créez un compte avec votre email (ou via GitHub)
4. Une fois connecté, cliquez sur **"New project"**
5. Remplissez :
   - **Name** : `bougies-paroisse` (ou le nom que vous souhaitez)
   - **Database password** : choisissez un mot de passe fort et **notez-le**
   - **Region** : `West EU (Ireland)` (le plus proche de la France)
6. Cliquez sur **"Create new project"** et attendez ~1 minute

---

## Étape 2 — Créer les tables (script SQL)

1. Dans votre projet Supabase, cliquez sur **"SQL Editor"** dans le menu gauche
2. Cliquez sur **"New query"**
3. Ouvrez le fichier `supabase_schema.sql` fourni avec l'application
4. Copiez **tout son contenu** et collez-le dans l'éditeur SQL
5. Cliquez sur **"Run"** (bouton vert en bas à droite)
6. Vous devez voir : `Success. No rows returned`

> ⚠️ Si vous voyez une erreur, vérifiez que vous avez bien tout copié depuis le début jusqu'à la fin du fichier.

---

## Étape 3 — Récupérer vos clés Supabase

1. Dans le menu gauche, cliquez sur **"Project Settings"** (icône engrenage)
2. Puis cliquez sur **"API"**
3. Notez les deux valeurs suivantes :
   - **Project URL** : ressemble à `https://abcdefghij.supabase.co`
   - **anon public key** : longue chaîne de caractères commençant par `eyJ...`

---

## Étape 4 — Préparer le fichier de configuration

1. Dans le dossier de l'application, trouvez le fichier `.env.example`
2. **Copiez-le** et renommez la copie `.env`
3. Ouvrez `.env` avec un éditeur de texte (Notepad, TextEdit…)
4. Remplacez les valeurs :
   ```
   VITE_SUPABASE_URL=https://VOTRE_PROJECT_ID.supabase.co
   VITE_SUPABASE_ANON_KEY=VOTRE_ANON_KEY
   ```
   Par vos vraies valeurs récupérées à l'étape 3.

---

## Étape 5 — Créer un compte GitHub (pour héberger le code)

> Si vous avez déjà GitHub, passez à l'étape 6.

1. Rendez-vous sur **https://github.com**
2. Créez un compte gratuit
3. Vérifiez votre email

---

## Étape 6 — Mettre le code sur GitHub

### Option A — Via l'interface web GitHub (recommandé pour débutants)

1. Connectez-vous sur GitHub
2. Cliquez sur **"New repository"** (bouton vert ou icône +)
3. Nommez-le `bougies-paroisse`, laissez **Public**
4. Cliquez **"Create repository"**
5. Cliquez sur **"uploading an existing file"**
6. Glissez-déposez **tous les fichiers du dossier** `candles-app`
7. Cliquez **"Commit changes"**

### Option B — Via terminal (si vous êtes à l'aise)

```bash
cd candles-app
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/VOTRE_NOM/bougies-paroisse.git
git push -u origin main
```

---

## Étape 7 — Créer un compte Netlify et déployer

1. Rendez-vous sur **https://www.netlify.com**
2. Cliquez sur **"Sign up"** → choisissez **"Sign up with GitHub"**
3. Autorisez Netlify à accéder à GitHub
4. Cliquez sur **"Add new site"** → **"Import an existing project"**
5. Cliquez sur **"Deploy with GitHub"**
6. Sélectionnez votre dépôt `bougies-paroisse`
7. Dans les paramètres de build, vérifiez :
   - **Build command** : `npm run build`
   - **Publish directory** : `dist`
8. Cliquez sur **"Deploy site"**

---

## Étape 8 — Ajouter les variables d'environnement sur Netlify

> Cette étape est **cruciale** — sans elle, l'application ne peut pas se connecter à Supabase.

1. Dans votre site Netlify, allez dans **"Site configuration"** → **"Environment variables"**
2. Cliquez **"Add a variable"** et ajoutez :
   - **Key** : `VITE_SUPABASE_URL` → **Value** : votre URL Supabase
   - **Key** : `VITE_SUPABASE_ANON_KEY` → **Value** : votre clé anon
3. Cliquez **"Save"**
4. Retournez dans **"Deploys"** et cliquez **"Trigger deploy"** → **"Deploy site"**

Après quelques secondes, votre site est en ligne à une adresse du type :
`https://amazing-name-123456.netlify.app`

---

## Étape 9 — Créer le premier compte administrateur

1. Ouvrez votre site sur Netlify
2. Cliquez sur **"Créer un compte"** et enregistrez-vous avec votre email
3. **Confirmez votre email** en cliquant sur le lien reçu
4. Connectez-vous à votre application
5. Retournez dans **Supabase** → **"SQL Editor"** → **"New query"**
6. Exécutez cette requête en remplaçant `votre@email.fr` par votre vrai email :

```sql
UPDATE profils
SET role = 'admin'
WHERE email = 'votre@email.fr';
```

7. Cliquez **"Run"** — vous devriez voir `1 row affected`
8. **Rechargez** votre application : le menu Admin apparaît maintenant

---

## Étape 10 — Configurer les paramètres Supabase Auth

Pour permettre aux membres de créer leur compte :

1. Dans Supabase → **"Authentication"** → **"Providers"**
2. Vérifiez que **Email** est activé
3. Dans **"Authentication"** → **"Email Templates"**, vous pouvez personnaliser les emails de confirmation

---

## ✅ L'application est prête !

**Ce que vous pouvez faire maintenant :**

- Aller dans **Admin → Bougies** pour ajouter vos références
- Aller dans **Admin → Lieux** pour personnaliser les lieux (Église, Chapelle, Sacristie sont déjà créés)
- Aller dans **Admin → Utilisateurs** pour promouvoir d'autres membres en admin
- Partager l'URL Netlify avec vos bénévoles

---

## 🔧 Dépannage fréquent

| Problème | Solution |
|----------|----------|
| Page blanche après déploiement | Vérifiez les variables d'environnement sur Netlify |
| "Invalid API key" | Vérifiez que `VITE_SUPABASE_ANON_KEY` est correct |
| Pas de confirmation d'email | Vérifiez les spams ou désactivez la confirmation dans Supabase Auth Settings |
| Erreur 404 en navigation | Vérifiez que le fichier `_redirects` est bien dans le dossier `public/` |
| Menu Admin absent | Exécutez la requête SQL de l'étape 9 |

---

## 📞 Mise à jour de l'application

Si vous recevez une nouvelle version des fichiers :
1. Remplacez les fichiers dans votre dépôt GitHub (glisser-déposer)
2. Netlify redéploie automatiquement en quelques secondes

---

*Guide rédigé pour un déploiement initial — Version 1.0*
