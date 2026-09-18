# Guide d'utilisation — SmartPOS Web

Bienvenue sur **SmartPOS**, l'espace de gestion web. Ce guide vous explique comment utiliser l'application tous les jours : vendre, suivre le stock, encaisser, gérer les clients et établir des rapports.

---

## 1. Se connecter

1. Ouvrez votre navigateur (Chrome, Firefox, Edge…).
2. Rendez-vous à l'adresse de l'application indiquée par votre administrateur.
3. Saisissez votre **nom d'utilisateur** (exemple : `admin`).
4. Saisissez votre **mot de passe**.
5. Cliquez sur **Se connecter**.

> 💡 Après la connexion, vous voyez le **Tableau de bord**. Le menu à gauche donne accès aux sections selon votre rôle, avec votre nom en bas du menu et le bouton **Déconnexion**.

**Les rôles** :
- **Admin** → tout est accessible (ventes, stock, rapports, paramètres, utilisateurs) ;
- **Gérant / Manager** → tout sauf les paramètres et la gestion des utilisateurs ;
- **Caissier / Caissière** → les ventes, l'historique, le stock (lecture) et les notifications ;
- **Gestionnaire de stock** → le suivi du stock (lecture seule + ajustements).

---

## 2. Le tableau de bord

C'est la première page. Elle résume l'activité :

- **4 indicateurs** : ventes du jour, revenus, ventes en espèces, produits en stock faible ;
- **Un graphique** d'évolution des ventes ;
- **Les dernières transactions** (numéro, montant, paiement, statut).

Vous pouvez :
- **Choisir la location / boutique** en haut à droite pour filtrer les données ;
- **Choisir la période** : Aujourd'hui, Cette semaine, Ce mois ;
- Cliquer sur **Actualiser** pour rafraîchir (l'écran se met aussi à jour tout seul toutes les 30 secondes, si l'option est active).

---

## 3. Faire une vente (Point de Vente)

La page **Ventes (PDV)** a deux zones : la **grille des produits** à gauche et le **panier** à droite.

1. **Cherchez le produit** : tapez son nom dans la recherche ou filtrez par type (chips au-dessus de la grille).
2. **Cliquez sur le produit** pour l'ajouter au panier.
   - S'il a plusieurs unités (pièce, carton…), une fenêtre demande quelle unité utiliser.
   - Si le stock est insuffisant, une alerte s'affiche.
3. Dans le panier, pour chaque article :
   - **+ / −** pour modifier la quantité ;
   - une **remise (%)** possible sur la ligne ;
   - la **taxe** (le cas échéant) ;
   - la **poubelle** 🗑️ pour retirer l'article.
4. **Choisissez le client** si nécessaire (client prenant à crédit).
5. Vérifiez le **sous-total**, la **remise** et le **total** en bas.
6. Cliquez sur **Encaisser / Paiement** :
   - le paiement se fait en **espèces** ;
   - saisissez le montant reçu : le rendu monnaie est calculé automatiquement.
7. Confirmez. Un **ticket** s'imprime (bouton **Imprimer**) et une **Nouvelle vente** relance un panier vide.

> ⚠️ Le stock se met à jour automatiquement après chaque vente.

---

## 4. Historique des ventes

1. Dans le menu, cliquez sur **Historique des ventes**.
2. La liste des transactions s'affiche, avec filtres : statut, période, recherche par numéro.
3. Depuis une transaction, vous pouvez :
   - voir le **détail** (articles, quantités, prix) ;
   - **réimprimer le ticket** ;
   - **payer** une transaction en attente ;
   - (admin / gérant) **modifier** ou **supprimer** une transaction.

---

## 5. Clients et crédits

### Clients
- **Clients** liste les clients enregistrés (nom, téléphone, solde crédit).
- **Nouveau client** permet d'en créer un : nom, téléphone, limite de crédit.

### Crédits
- **Crédit** affiche, pour chaque client, le montant dû et l'historique des encaissements.
- Pour un paiement : sélectionnez le client, cliquez sur **Encaisser**, saisissez le montant puis **Confirmer**.

---

## 6. La caisse (sessions)

Avant de vendre, il est conseillé d'ouvrir la session caisse du service :

1. Allez dans **Caisse**.
2. **Ouvrir la caisse** en saisissant le montant d'ouverture (argent dans le tiroir).
3. Les ventes s'ajoutent automatiquement à la session.
4. En fin de service, **Fermer la caisse** avec le montant réel dans le tiroir : le système calcule l'écart éventuel et enregistre un relevé.

---

## 7. Suivre et gérer le stock

- **État du stock** : niveaux par emplacement, produits "En stock", "Stock bas", "Rupture".
- **Ajustements de stock** : corriger le stock (perte, casse, erreur, entrée/sortie manuelle).
- **Comptage d'inventaire** : compter le stock réel pour le comparer au stock théorique.
- **Mouvements de stock** : historique de toutes les entrées/sorties (ventes, achats, transferts, ajustements).
- **Transferts** : déplacer du stock d'un emplacement à un autre (source → destinataire).

> 💡 Le menu **Locations** permet de créer et organiser vos emplacements (boutique 1, boutique 2…).

---

## 8. Achats et fournisseurs

- **Fournisseurs** : la liste de vos fournisseurs (nouveau fournisseur : nom, contact, téléphone).
- **Achats** : passez une commande fournisseur (**Nouvel achat**) avec les articles et quantités ; quand la marchandise arrive, **Marquer comme reçu** met automatiquement le stock à jour.
- **Dépenses** : enregistrez les dépenses de la boutique (loyer, électricité…) par catégorie.

---

## 9. Finance et rapports

- **Finance** : vue d'ensemble (revenus, dépenses, crédits en cours, bénéfice) et sous-sections (paiements, rapports financiers).
- **Rapports** : générez un rapport de ventes / stocks entièrement, choisissez la période et **imprimez** (format A4).

---

## 10. Notifications

- Cliquez sur la **cloche** 🔔 en haut à droite ou allez dans **Notifications**.
- Vous y trouvez les alertes : **stock faible**, **rupture**, et informations importantes.
- Filtrez par type pour ne garder que ce qui vous concerne.

---

## 11. Produits (admin / gérant)

1. Allez dans **Products** (Produits).
2. **Nouveau produit** : nom, type, sous-catégorie, stock minimum, et les **unités de vente** (nom, prix, facteur de conversion).
3. Enregistrez. Le produit apparaît alors dans la grille de vente.

---

## 12. Utilisateurs et paramètres (admin uniquement)

- **Users** (Utilisateurs) : **Ajouter un utilisateur** (nom, email, téléphone, mot de passe, rôle). Vous pouvez ensuite modifier un utilisateur (rôle, mot de passe) ou **assigner la location de vente** d'un caissier.
- **Paramètres** : 11 onglets pour configurer : infos boutique (nom, devise…), types de produits, catégories, groupes, unités, fournisseurs, locations, permissions des menus, et utilisateurs & rôles.

> ⚠️ Ces pages sont réservées à l'**administrateur**.

---

## 13. Se déconnecter

Cliquez sur **Déconnexion** en bas du menu de gauche. Pensez à déconnecter à la fin du service, surtout sur un poste partagé.

---

## 14. Dépannage rapide

| Problème | Solution |
|---|---|
| Je ne peux pas me connecter | Vérifiez le nom d'utilisateur et le mot de passe ; en cas de doute, contactez l'administrateur. |
| Je ne vois pas une section | Elle est réservée à votre rôle. Contactez l'administrateur si vous devriez y avoir accès. |
| Un produit n'apparaît pas dans la vente | Vérifiez qu'il existe dans **Products** et qu'il possède au moins une unité de vente. |
| Le stock est faux | Faites un **ajustement de stock** ou un **comptage d'inventaire**. |
| Le ticket ne s'imprime pas | Vérifiez l'impression du navigateur (fenêtre d'impression) et l'imprimante sélectionnée. |
| Mot de passe oublié | L'administrateur peut réinitialiser votre mot de passe depuis **Users**. |

---

## En résumé

1. **Connectez-vous** avec votre nom d'utilisateur.
2. **Tableau de bord** pour surveiller l'activité du jour.
3. **Ventes (PDV)** pour encaisser les clients.
4. **Stock** pour vérifier les niveaux et transférer entre les boutiques.
5. **Caisse** : ouvrir le matin, fermer le soir.
6. **Rapports** en fin de période pour analyser l'activité.

Si vous rencontrez un problème, contactez votre administrateur avec le numéro de transaction ou le produit concerné.