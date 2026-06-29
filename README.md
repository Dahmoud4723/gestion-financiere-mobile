# 📱 Gestion Financière — Application Mobile

Application mobile React Native pour la gestion financière d'IDER SI.

## 🚀 Stack technique

- **Framework** : React Native + Expo SDK 56
- **Langage** : TypeScript
- **Navigation** : React Navigation

## ⚙️ Installation

```bash
git clone https://github.com/Dahmoud4723/gestion-financiere-mobile.git
cd gestion-financiere-mobile
npm install
```

## 🔧 Configuration

Dans `src/services/api.ts`, modifiez l'IP :

```typescript
const api = axios.create({
  baseURL: 'http://VOTRE_IP:3001',
});
```

## ▶️ Lancement

```bash
npx expo start
```

Scanner le QR code avec l'app Expo Go.

## 📱 Écrans

| Écran | Description |
|-------|-------------|
| Login | Connexion + Face ID |
| Register | Inscription avec organisation |
| Dashboard | KPIs + graphique 6 mois |
| Transactions | Liste + filtres + recherche |
| Budgets | Barres progression + donut chart |
| Comptes | Soldes + virement |
| Alertes | Notifications budget |
| Profil | Modifier infos + mot de passe |

## ✨ Fonctionnalités

- 🔐 Auth JWT + Face ID / Touch ID
- 🔔 Notifications push
- 📊 Graphique donut budgets (react-native-svg)
- 🔍 Recherche transactions
- 💸 Virement entre comptes
- 📱 Support Bankily, Masrvi, Sedad, Cash

## 👤 Auteur

**Dahmoud** — Étudiant en informatique, matricule 22044  
Stage chez IDER SI, Nouakchott, Mauritanie