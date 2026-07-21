# Manuel d'utilisation SmartPOS

## Système de Point de Vente et Gestion de Stock

---

Version 1.0 — Juin 2026

---

# Table des matières

1. [Introduction](#1-introduction)
2. [Rôles et Permissions](#2-rôles-et-permissions)
3. [Connexion et Première Utilisation](#3-connexion-et-première-utilisation)
4. [Tableau de Bord](#4-tableau-de-bord)
5. [Ventes / Point de Vente](#5-ventes--point-de-vente)
6. [Commandes Cuisine](#6-commandes-cuisine)
7. [Historique des Ventes](#7-historique-des-ventes)
8. [Achats](#8-achats)
9. [Gestion des Produits](#9-gestion-des-produits)
10. [Gestion des Stocks](#10-gestion-des-stocks)
11. [Mouvements et Transferts de Stock](#11-mouvements-et-transferts-de-stock)
12. [Caisse](#12-caisse)
13. [Dépenses](#13-dépenses)
14. [Clients](#14-clients)
15. [Gestion des Crédits](#15-gestion-des-crédits)
16. [Personnel et Tables](#16-personnel-et-tables)
17. [Finance](#17-finance)
18. [Rapports](#18-rapports)
19. [Paramètres](#19-paramètres)
20. [Fournisseurs](#20-fournisseurs)
21. [Notifications](#21-notifications)
22. [Boulangerie / Pâtisserie](#22-boulangerie--pâtisserie)
23. [Annexes](#23-annexes)

---

## 1. Introduction

### 1.1 Présentation de SmartPOS

SmartPOS est une application web de point de vente (POS) et de gestion intégrée destinée aux restaurants, bars, boulangeries et commerces de détail. Elle permet de :

- Vendre et encaisser des articles
- Gérer les commandes cuisine en temps réel
- Suivre les stocks sur plusieurs emplacements
- Gérer les clients et les ventes à crédit
- Suivre la caisse journalière
- Générer des rapports d'activité
- Imprimer des tickets thermiques et des factures

### 1.2 Prérequis techniques

- Un **navigateur web moderne** : Google Chrome, Mozilla Firefox, Safari ou Microsoft Edge (dernière version recommandée)
- Une **connexion internet** stable
- Une **imprimante thermique** (optionnelle, pour l'impression de tickets 80mm)
- Une **imprimante A4** (optionnelle, pour l'impression de factures)

### 1.3 Accès à l'application

L'application est accessible via une URL fournie par l'administrateur (exemple : `https://smartpos.votre-domaine.com`).

---

## 2. Rôles et Permissions

SmartPOS utilise un système de rôles qui détermine les fonctionnalités accessibles à chaque utilisateur.

| Rôle | Accès principal |
|------|----------------|
| **Admin** | Toutes les fonctionnalités, y compris les paramètres et la gestion des utilisateurs |
| **Manager** | Toutes les fonctionnalités sauf les paramètres |
| **Caissier** | Ventes, historique, produits, stocks (lecture), caisse, clients |
| **Serveur** | Ventes (prise de commande uniquement) |
| **Chef de cuisine** | Commandes cuisine uniquement |
| **Stock manager** | Gestion des stocks (ajustements, inventaire, transferts) |

Chaque utilisateur se voit attribuer un rôle par l'administrateur lors de la création de son compte.

---

## 3. Connexion et Première Utilisation

### 3.1 Page de connexion

`[Capture d'écran : page de connexion SmartPOS]`

1. Ouvrez votre navigateur et rendez-vous à l'URL de l'application.
2. Saisissez votre **adresse email** (exemple : `votre.nom@etablissement.fr`).
3. Saisissez votre **mot de passe** (communiqué par l'administrateur).
4. Cliquez sur le bouton **Se connecter**.

> **Première connexion :** L'administrateur crée votre compte et vous communique vos identifiants. Vous pouvez modifier votre mot de passe depuis votre profil une fois connecté.

### 3.2 Déconnexion

Cliquez sur votre nom en haut à droite de l'écran, puis sélectionnez **Se déconnecter**.

### 3.3 Profil utilisateur

`[Capture d'écran : page de profil]`

Depuis le menu latéral, cliquez sur **Profil**. Vous pouvez y :
- Voir vos informations (nom, email, rôle)
- Modifier votre mot de passe

### 3.4 Navigation dans l'application

L'application se compose de :
- **Un menu latéral gauche** : permet d'accéder à toutes les sections selon votre rôle
- **Un en-tête** : affiche votre nom, les notifications et la connexion
- **Une zone de contenu centrale** : affiche la page active
- **Un fil d'Ariane** : indique votre position dans l'application

---

## 4. Tableau de Bord

`[Capture d'écran : tableau de bord]`

Le tableau de bord est la première page affichée après la connexion. Il donne une vue d'ensemble de l'activité du jour.

### 4.1 Indicateurs clés

- **Chiffre d'affaires du jour** : montant total des ventes du jour
- **Nombre de commandes** : total des commandes passées aujourd'hui
- **Stocks critiques** : nombre de produits dont le stock est bas (alerte de réapprovisionnement)
- **Client du moment** : client ayant le plus d'achats récents (selon configuration)

### 4.2 Graphique des ventes

Un graphique interactif affiche l'évolution des ventes. Vous pouvez sélectionner la période :
- **Aujourd'hui**
- **Cette semaine**
- **Ce mois**
- **Cette année**

### 4.3 Dernières transactions

La liste des dernières transactions effectuées apparaît en bas de page avec :
- Le numéro de transaction
- Le montant
- Le mode de paiement
- Le statut
- La date et l'heure

### 4.4 Commandes en cours

Un aperçu des commandes en attente ou en préparation, avec leur nombre par statut.

> Le tableau de bord se rafraîchit automatiquement toutes les 30 secondes. Vous pouvez également cliquer sur le bouton **Actualiser** pour une mise à jour immédiate.

---

## 5. Ventes / Point de Vente

`[Capture d'écran : écran de vente POS]`

La section **Ventes** est le cœur du système. Elle permet de créer des commandes et d'encaisser les clients.

### 5.1 Avant de commencer : ouverture de caisse

Avant de pouvoir effectuer une vente, vous devez ouvrir une **session caisse**. Voir la section [Caisse](#12-caisse).

### 5.2 Créer une nouvelle commande

1. Depuis le menu, cliquez sur **Ventes**.
2. La page se compose de deux parties :
   - **À gauche** : la grille des produits
   - **À droite** : le panier

#### 5.2.1 Sélection des articles

- Utilisez les **onglets de catégories** (Entrées, Plats, Boissons, Desserts, etc.) pour filtrer les produits.
- Utilisez le **champ de recherche** pour trouver un produit par son nom.
- Cliquez sur un produit pour l'ajouter au panier.
- Vous pouvez également sélectionner un **secteur** (Bar, Cuisine, Pâtisserie) pour affiner la recherche.

#### 5.2.2 Gestion du panier

- **Quantité** : modifiez la quantité en cliquant sur les boutons `+` et `-` ou en saisissant directement le nombre.
- **Prix** : le prix unitaire s'affiche automatiquement. Vous pouvez le modifier si nécessaire (selon vos droits).
- **Remise** : appliquez une remise sur une ligne d'article ou sur le total de la commande.
- **Unité de vente** : sélectionnez l'unité (exemple : pièce, verre, bouteille, kg).
- **Supprimer** : retirez un article du panier en cliquant sur l'icône poubelle.

> Les remises et modifications de prix peuvent être restreintes selon votre rôle.

### 5.3 Modes de commande

Trois modes sont disponibles :

| Mode | Description |
|------|-------------|
| **Sur place** | Le client consomme dans l'établissement. Vous pouvez lui attribuer une table. |
| **À emporter** | Le client emporte sa commande. |
| **Comptoir** | Vente rapide au comptoir. |

Pour le mode **Sur place**, sélectionnez une table dans la liste. Les tables sont organisées par section (terrasse, salle, etc.).

### 5.4 Attribution d'un serveur

Si vous êtes manager ou administrateur, vous pouvez attribuer la commande à un serveur spécifique.

### 5.5 Sélection du client

- **Client libre** (par défaut) : aucun nom n'est enregistré.
- **Client existant** : sélectionnez un client dans la liste ou créez-en un nouveau.

### 5.6 Passage en cuisine

Une fois la commande finalisée, cliquez sur **Passer en cuisine**. La commande apparaît alors dans l'écran des commandes cuisine.

### 5.7 Paiement

`[Capture d'écran : dialogue de paiement]`

1. Cliquez sur le bouton **Paiement**.
2. Sélectionnez le mode de paiement :
   - **Espèces** : saisissez le montant reçu. Le rendu monnaie est calculé automatiquement.
   - **Carte bancaire** : le montant total est affiché.
   - **Crédit client** : le montant est ajouté au crédit du client (un client doit être sélectionné).
   - **Paiement mixte** : vous pouvez combiner plusieurs modes (exemple : 10 € en espèces + 20 € par carte).
3. Confirmez le paiement.

### 5.8 Après le paiement

- Un **ticket thermique** est automatiquement imprimé (si une imprimante est configurée).
- Vous pouvez également imprimer une **facture A4**.
- La transaction est enregistrée dans l'historique des ventes.

---

## 6. Commandes Cuisine

`[Capture d'écran : écran cuisine]`

La section **Cuisine** affiche les commandes en temps réel pour le personnel de cuisine.

### 6.1 File d'attente des commandes

Les commandes sont organisées en trois colonnes :

| Colonne | Description |
|---------|-------------|
| **En attente** | Nouvelles commandes reçues |
| **En préparation** | Commandes en cours de réalisation |
| **Prêt** | Commandes prêtes à être servies |

### 6.2 Actions sur une commande

- **Prendre en charge** : fait passer la commande d'« En attente » à « En préparation ».
- **Marquer comme prêt** : fait passer la commande de « En préparation » à « Prêt ».
- **Imprimer** : imprime le ticket cuisine (affiche uniquement les noms des articles et les quantités, sans les prix).

### 6.3 Actualisation

Les commandes se mettent à jour automatiquement. Vous pouvez également cliquer sur le bouton **Actualiser** pour rafraîchir manuellement la liste.

### 6.4 Commandes terminées

Les commandes marquées comme « Prêt » restent affichées dans la colonne jusqu'à ce qu'elles soient servies. Une fois servies, elles disparaissent de l'écran cuisine.

---

## 7. Historique des Ventes

`[Capture d'écran : historique des ventes]`

Cette section permet de consulter l'ensemble des transactions effectuées.

### 7.1 Filtres de recherche

| Filtre | Description |
|--------|-------------|
| **Statut** | Payé, En attente, Annulé |
| **Table** | Filtrer par numéro de table |
| **Serveur** | Filtrer par nom du serveur |
| **Date** | Période spécifique (date de début à date de fin) |
| **Recherche** | Recherche par numéro de transaction |

### 7.2 Actions disponibles

Pour chaque transaction, vous pouvez :

- **Voir les détails** : affiche le contenu complet de la transaction
- **Payer** : pour les transactions en attente de paiement
- **Réimprimer le ticket** : imprime à nouveau le ticket thermique
- **Imprimer la facture A4** : génère une facture au format A4
- **Modifier** (manager/admin uniquement) : modifier les articles ou les prix
- **Supprimer** (manager/admin uniquement) : annuler la transaction et mettre à jour le stock

### 7.3 Rapport d'activité

Un bouton **Rapport d'activité** génère un récapitulatif imprimable avec :
- Le nombre total de transactions
- Le chiffre d'affaires par mode de paiement (espèces, carte, crédit)
- La répartition des ventes

---

## 8. Achats

`[Capture d'écran : liste des achats]`

La section **Achats** permet de gérer les commandes passées aux fournisseurs.

### 8.1 Créer un achat

1. Cliquez sur **Nouvel achat**.
2. Sélectionnez un **fournisseur** dans la liste.
3. Ajoutez des **articles** avec leur quantité et leur prix d'achat.
4. Sélectionnez le **secteur** concerné (bar, cuisine, pâtisserie).
5. Enregistrez la commande.

### 8.2 Statuts des achats

| Statut | Description |
|--------|-------------|
| **En attente** | Commande envoyée au fournisseur, non encore reçue |
| **Reçu** | Marchandise reçue, stock mis à jour |
| **Annulé** | Commande annulée |

### 8.3 Réception d'un achat

Lorsque la marchandise arrive :
1. Ouvrez l'achat dans la liste.
2. Cliquez sur **Marquer comme reçu**.
3. Le stock est automatiquement mis à jour.

---

## 9. Gestion des Produits

`[Capture d'écran : liste des produits]`

### 9.1 Liste des produits

La liste affiche tous les produits avec :
- **Nom** et **image**
- **Prix de vente** (TTC)
- **Stock disponible** (tous emplacements confondus)
- **Catégorie** (Entrées, Plats, Boissons, etc.)
- **Secteur** (Bar, Cuisine, Pâtisserie)
- **Statut** (Actif / Inactif)

### 9.2 Créer un produit

1. Cliquez sur **Nouveau produit**.
2. Remplissez les champs :
   - **Nom** (obligatoire)
   - **Catégorie** (obligatoire)
   - **Prix de vente** (obligatoire)
   - **Secteur** (Bar, Cuisine, Pâtisserie)
   - **Type** (Boisson, Nourriture, Ingrédient)
   - **Image** (optionnelle)
3. Si le produit est **suivi en stock**, activez l'option correspondante et définissez :
   - **Stock d'alerte** : seuil minimum avant alerte de réapprovisionnement
   - **Quantité de réapprovisionnement** : quantité recommandée à commander
4. Cliquez sur **Enregistrer**.

### 9.3 Unités de vente

Un produit peut avoir plusieurs unités de vente avec des facteurs de conversion. Par exemple :
- Une boisson peut être vendue en `Verre` (25cl) ou `Bouteille` (75cl)
- Un ingrédient peut être vendu en `Pièce`, `Kg` ou `Lot`

Pour ajouter une unité de vente :
1. Dans le formulaire du produit, allez dans la section **Unités de vente**.
2. Cliquez sur **Ajouter une unité**.
3. Sélectionnez l'unité et le prix correspondant.

### 9.4 Modifier / Supprimer un produit

- Cliquez sur un produit pour le modifier.
- Utilisez le bouton **Supprimer** pour retirer un produit (uniquement s'il n'a jamais été utilisé dans une transaction).

---

## 10. Gestion des Stocks

### 10.1 État des stocks

`[Capture d'écran : page des stocks]`

La page **Stocks** affiche les niveaux de stock par emplacement :
- Stock principal (dépôt)
- Stock bar
- Stock cuisine
- Zone de transition

Pour chaque produit, vous voyez la quantité disponible dans chaque emplacement.

### 10.2 Ajustements de stock

`[Capture d'écran : formulaire d'ajustement]`

Les ajustements permettent de modifier manuellement le stock (casse, perte, retour, correction).

1. Allez dans **Stocks > Ajustements**.
2. Cliquez sur **Nouvel ajustement**.
3. Sélectionnez :
   - Le **produit**
   - L'**emplacement**
   - Le **type de mouvement** :

| Type | Effet sur le stock |
|------|-------------------|
| **Entrée manuelle** | Augmente le stock |
| **Sortie manuelle** | Diminue le stock |
| **Perte / Casse** | Diminue le stock (enregistre la perte) |
| **Retour fournisseur** | Diminue le stock |
| **Correction** | Ajuste au stock réel |

4. Saisissez la **quantité** et une **note** (optionnelle).
5. Cliquez sur **Valider**.

### 10.3 Inventaire physique

`[Capture d'écran : session d'inventaire]`

L'inventaire physique permet de compter manuellement le stock réel et de le comparer au stock théorique.

#### Créer une session d'inventaire

1. Allez dans **Stocks > Inventaire**.
2. Cliquez sur **Nouvel inventaire**.
3. Sélectionnez l'**emplacement** à inventorier.
4. Pour chaque produit, saisissez la **quantité réelle** comptée.
5. Cliquez sur **Valider l'inventaire**.

Le système calcule automatiquement les écarts entre le stock théorique et le stock réel et propose de les corriger.

---

## 11. Mouvements et Transferts de Stock

### 11.1 Mouvements de stock

`[Capture d'écran : historique des mouvements]`

La page **Mouvements de stock** affiche l'historique complet de toutes les entrées et sorties de stock :
- Ventes (sorties)
- Achats (entrées)
- Ajustements (entrées/sorties)
- Transferts (entre emplacements)
- Production (entrées/sorties)

Vous pouvez filtrer par :
- **Type de mouvement**
- **Produit**
- **Emplacement**
- **Période**

### 11.2 Transferts entre emplacements

`[Capture d'écran : transfert de stock]`

Les transferts permettent de déplacer du stock d'un emplacement à un autre.

#### Créer un transfert

1. Allez dans **Stock > Transferts**.
2. Cliquez sur **Nouveau transfert**.
3. Sélectionnez :
   - **Emplacement source** (exemple : Stock principal)
   - **Emplacement destinataire** (exemple : Bar)
4. Ajoutez les **produits** et les **quantités** à transférer.

#### Types de transfert prédéfinis

- **Vers le bar**
- **Vers la cuisine**
- **Vers la zone de transition**
- **Sortie bar**
- **Sortie cuisine**
- **Retour cuisine**

---

## 12. Caisse

`[Capture d'écran : page caisse]`

La gestion de caisse permet de suivre les encaissements et les mouvements d'argent.

### 12.1 Ouvrir une session caisse

Avant de pouvoir vendre, vous devez ouvrir une session caisse.

1. Allez dans **Caisse**.
2. Cliquez sur **Ouvrir la caisse**.
3. Saisissez le **montant d'ouverture** (argent présent dans le tiroir-caisse au début du service).
4. La session caisse est maintenant active.

### 12.2 Pendant le service

Toutes les ventes sont automatiquement enregistrées dans la session caisse active. Vous pouvez également ajouter des **mouvements de caisse** :
- **Entrée d'argent** : exemple : dépôt d'argent dans la caisse
- **Sortie d'argent** : exemple : retrait pour payer un fournisseur

### 12.3 Fermer une session caisse

1. Cliquez sur **Fermer la caisse**.
2. Saisissez le **montant de clôture** (argent réellement présent dans le tiroir).
3. Le système compare :
   - Le solde attendu (ventes + ouverture + mouvements)
   - Le solde réel (montant de clôture)
4. Un **écart** éventuel est affiché.
5. Confirmez la fermeture.

### 12.4 Relevé de caisse

Après fermeture, un relevé détaillé est disponible avec :
- Le montant d'ouverture
- Le total des ventes (espèces, carte, crédit)
- Les mouvements de caisse
- Le solde attendu
- Le solde réel
- La différence éventuelle

---

## 13. Dépenses

`[Capture d'écran : liste des dépenses]`

### 13.1 Enregistrer une dépense

1. Allez dans **Dépenses**.
2. Cliquez sur **Nouvelle dépense**.
3. Remplissez les champs :
   - **Catégorie** (Loyer, Électricité, Salaire, Fournitures, Entretien, etc.)
   - **Montant**
   - **Date**
   - **Description** (optionnelle)
4. Cliquez sur **Enregistrer**.

### 13.2 Liste et filtres

La liste des dépenses peut être filtrée par :
- **Catégorie**
- **Période**
- **Montant**

---

## 14. Clients

`[Capture d'écran : liste des clients]`

### 14.1 Liste des clients

La page **Clients** affiche tous les clients enregistrés avec :
- **Nom** et **prénom**
- **Téléphone** et **email**
- **Solde crédit** actuel
- **Limite de crédit**

### 14.2 Créer un client

1. Cliquez sur **Nouveau client**.
2. Saisissez les informations :
   - **Nom** (obligatoire)
   - **Prénom**
   - **Téléphone**
   - **Email**
   - **Limite de crédit** (montant maximum autorisé)
3. Cliquez sur **Enregistrer**.

### 14.3 Modifier un client

Cliquez sur un client dans la liste pour modifier ses informations.

---

## 15. Gestion des Crédits

`[Capture d'écran : page des crédits]`

### 15.1 Suivi des crédits

La page **Crédits** affiche pour chaque client :
- Le montant total dû
- Les ventes à crédit en cours
- L'historique des paiements

### 15.2 Effectuer un paiement de crédit

1. Allez dans **Crédits**.
2. Sélectionnez un client.
3. Cliquez sur **Encaisser**.
4. Saisissez le **montant** payé.
5. Sélectionnez le **mode de paiement** (espèces ou carte).
6. Cliquez sur **Confirmer**.

---

## 16. Personnel et Tables

`[Capture d'écran : page personnel et tables]`

### 16.1 Gestion des serveurs

1. Allez dans **Personnel et Tables**.
2. Vous pouvez :
   - **Ajouter** un serveur (nom, contact)
   - **Modifier** les informations d'un serveur
   - **Supprimer** un serveur

### 16.2 Gestion des tables

1. Dans la même section, gérez les tables de votre établissement.
2. Pour chaque table, définissez :
   - **Numéro** ou nom de la table
   - **Capacité** (nombre de couverts)
   - **Section** (Terrasse, Salle principale, Salon privé, etc.)

---

## 17. Finance

`[Capture d'écran : page finance]`

La section **Finance** offre une vue d'ensemble des flux financiers.

### 17.1 Vue d'ensemble

- **Revenus** : total des ventes sur la période
- **Dépenses** : total des dépenses enregistrées
- **Crédits en cours** : montant total dû par les clients
- **Bénéfice brut** : revenus - dépenses

### 17.2 Sections financières

- **Dépenses** : liste détaillée de toutes les dépenses
- **Cuisine** : suivi financier spécifique à la cuisine (coûts des matières premières, etc.)
- **Paiements** : registre de tous les paiements reçus
- **Rapports financiers** : états financiers personnalisables

---

## 18. Rapports

`[Capture d'écran : page des rapports]`

### 18.1 Types de rapports

| Rapport | Description |
|---------|-------------|
| **Rapport de ventes** | Chiffre d'affaires par période, par catégorie, par serveur |
| **Rapport de stocks** | État des stocks, valorisation, ruptures |
| **Rapport d'activité** | Transactions, modes de paiement, fréquentation |

### 18.2 Générer un rapport

1. Allez dans **Rapports**.
2. Sélectionnez le **type de rapport**.
3. Définissez la **période**.
4. Cliquez sur **Générer**.
5. Vous pouvez **imprimer** le rapport au format A4.

---

## 19. Paramètres

`[Capture d'écran : page des paramètres]`

La section **Paramètres** est accessible uniquement aux administrateurs.

### 19.1 Configuration de l'établissement

Configurez les informations générales :
- **Nom de l'établissement**
- **Adresse**
- **Téléphone**
- **Email**
- **Taux de taxe** (TVA)
- **Devise** et **symbole monétaire**

### 19.2 Gestion des catégories

Créez, modifiez ou supprimez des catégories de produits (Entrées, Plats, Boissons, Desserts, etc.) et des groupes de catégories.

### 19.3 Unités de mesure

Gérez les unités de mesure (Pièce, Kg, Litre, Verre, Bouteille, etc.) utilisées pour les produits.

### 19.4 Emplacements

Gérez les emplacements de stock (Stock principal, Bar, Cuisine, Zone de transition).

### 19.5 Gestion des utilisateurs

`[Capture d'écran : gestion des utilisateurs]`

1. Allez dans **Paramètres > Utilisateurs**.
2. Cliquez sur **Nouvel utilisateur**.
3. Remplissez :
   - **Nom** et **prénom**
   - **Email** (utilisé pour la connexion)
   - **Mot de passe**
   - **Rôle** (Admin, Manager, Caissier, Serveur, Chef de cuisine, Stock manager)
4. Cliquez sur **Enregistrer**.

### 19.6 Permissions des menus

Configurez la visibilité des éléments du menu latéral pour chaque rôle. Par exemple, vous pouvez masquer la section Finance aux serveurs ou la section Paramètres aux managers.

---

## 20. Fournisseurs

`[Capture d'écran : liste des fournisseurs]`

### 20.1 Liste des fournisseurs

La page **Fournisseurs** affiche tous les fournisseurs enregistrés avec leurs coordonnées.

### 20.2 Créer un fournisseur

1. Cliquez sur **Nouveau fournisseur**.
2. Saisissez :
   - **Nom** (obligatoire)
   - **Contact** (nom du commercial)
   - **Téléphone**
   - **Email**
   - **Adresse**
3. Cliquez sur **Enregistrer**.

---

## 21. Notifications

`[Capture d'écran : centre de notifications]`

### 21.1 Types de notifications

Le système génère des notifications pour :
- **Stocks critiques** : un produit atteint son seuil d'alerte
- **Commandes en attente** : nouvelle commande reçue en cuisine
- **Crédits en retard** : un client dépasse sa limite de crédit

### 21.2 Consulter les notifications

- Cliquez sur l'icône **cloche** dans l'en-tête pour voir les notifications récentes.
- Allez dans **Notifications** pour voir l'historique complet.

---

## 22. Boulangerie / Pâtisserie

Si votre établissement est une boulangerie ou pâtisserie, des fonctionnalités spécifiques sont disponibles.

### 22.1 Production

`[Capture d'écran : production boulangerie]`

1. Allez dans **Boulangerie > Production**.
2. Créez une **fiche technique** (recette) avec les ingrédients et les quantités nécessaires.
3. Lancez une **production** : le système déduit automatiquement les ingrédients du stock et ajoute le produit fini.

### 22.2 Matières premières

Gérez les matières premières spécifiques à la boulangerie (farine, levure, beurre, etc.) dans **Boulangerie > Matières premières**.

### 22.3 Achats boulangerie

Passez des commandes d'approvisionnement spécifiques via **Boulangerie > Achats**.

---

## 23. Annexes

### 23.1 Impression

#### Ticket thermique (80mm)

Le ticket thermique est imprimé automatiquement après chaque vente. Il contient :
- Le nom et l'adresse de l'établissement
- Le numéro de transaction
- La liste des articles avec quantités et prix
- Le total et le montant payé
- Le mode de paiement

#### Facture A4

La facture A4 peut être imprimée depuis l'historique des ventes. Elle contient les mêmes informations que le ticket thermique, avec une mise en page professionnelle.

### 23.2 Secteurs

Les secteurs permettent d'organiser les produits par zone de production :

| Secteur | Description |
|---------|-------------|
| **Bar** | Boissons et snacks préparés au bar |
| **Cuisine** | Plats préparés en cuisine |
| **Pâtisserie** | Pâtisseries et viennoiseries |

### 23.3 Zones de stock

| Zone | Description |
|------|-------------|
| **Stock principal** | Dépôt central / réserve principale |
| **Bar** | Stock disponible au bar |
| **Cuisine** | Stock disponible en cuisine |
| **Zone de transition** | Zone tampon pour les transferts en cours |

### 23.4 Modes de paiement

| Mode | Description |
|------|-------------|
| **Espèces** | Paiement en liquide avec calcul automatique du rendu monnaie |
| **Carte bancaire** | Paiement par carte (le terminal est géré indépendamment) |
| **Crédit client** | Le montant est ajouté au crédit du client |

### 23.5 Raccourcis et astuces

- **Actualisation** : utilisez le bouton Actualiser ou la touche `F5` sur la plupart des pages.
- **Recherche rapide** : utilisez le champ de recherche dans la grille des produits pour trouver un article rapidement.
- **Sessions caisse** : pensez à fermer votre session caisse à la fin de chaque service.

### 23.6 Dépannage rapide

| Problème | Solution |
|----------|----------|
| Impossible de vendre | Vérifiez qu'une session caisse est ouverte (voir section 12) |
| Un produit n'apparaît pas | Vérifiez qu'il est actif dans la gestion des produits |
| Le stock n'est pas correct | Effectuez un ajustement de stock ou un inventaire |
| Mot de passe oublié | Contactez l'administrateur pour réinitialiser votre mot de passe |
| Impression ne fonctionne pas | Vérifiez la connexion de l'imprimante et sa configuration |

---

> **Fin du manuel.** Pour toute assistance complémentaire, contactez votre administrateur système ou reportez-vous à la documentation technique.
