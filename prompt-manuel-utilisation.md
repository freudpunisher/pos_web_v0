# Prompt pour rédiger le manuel d'utilisation SmartPOS

Tu es rédacteur technique. Rédige un manuel d'utilisation complet en français pour l'application **SmartPOS**, un système de point de vente (POS) et de gestion de stock destiné aux restaurants, bars et commerces de détail.

## Contexte de l'application

SmartPOS est une application web (Next.js) avec les fonctionnalités suivantes : vente encaissement, gestion des commandes cuisine, gestion des produits et stocks, achats, clients, crédits, caisse journalière, dépenses, rapports, et paramétrage. Elle utilise un système de rôles : **admin**, **manager**, **caissier**, **serveur**, **chef de cuisine**.

## Structure du manuel attendue

### 1. Introduction
- Présentation de SmartPOS
- Prérequis techniques (navigateur moderne, connexion internet)
- Accès à l'application (URL, page de connexion)

### 2. Rôles et permissions
| Rôle | Accès principal |
|------|----------------|
| Admin | Toutes les fonctionnalités, y compris paramètres et utilisateurs |
| Manager | Toutes sauf paramètres |
| Caissier | Ventes, historique, produits, stocks (lecture), caisse, clients |
| Serveur | Ventes (commande uniquement) |
| Chef cuisine | Commandes cuisine uniquement |

### 3. Connexion et première utilisation
- Page de connexion (email + mot de passe)
- Déconnexion
- Profil utilisateur

### 4. Tableau de bord (/dashboard)
- Vue d'ensemble : chiffre d'affaires du jour, commandes en cours, stocks critiques, dernières transactions
- Indicateurs clés (cartes de statistiques)

### 5. Ventes / Point de vente (/sales)
- Créer une nouvelle commande : sélection des articles par catégorie/secteur
- Gestion du panier : quantité, prix, remises, unités de vente
- Modes de commande : sur place (table), à emporter, comptoir
- Sélection de client (client libre ou existant)
- Paiement : espèces, carte, crédit client
- Session caisse obligatoire avant toute vente

### 6. Commandes Cuisine (/orders/kitchen)
- Fil d'attente des commandes : en attente → en préparation → prêt
- Impression des commandes (quantité + nom article uniquement, sans prix)
- Actualisation manuelle des commandes
- Historique des commandes terminées

### 7. Historique des ventes (/sales-history)
- Filtres : statut (payé/en attente/annulé), table, serveur, date, recherche
- Actions par transaction : voir détails, payer (pour impayées), réimpression ticket, facture A4
- Pour les managers : modifier ou supprimer les factures non payées (avec mise à jour du stock)
- Rapport d'activité imprimable avec répartition par mode de paiement

### 8. Achats (/purchases)
- Création d'achats auprès des fournisseurs
- Liste des achats avec statut

### 9. Gestion des produits (/products)
- Liste des produits avec stock, prix, catégorie, secteur
- Création, modification, suppression de produits
- Gestion des unités de vente (conversion)
- Produits avec ou sans suivi de stock

### 10. Gestion des stocks (/inventory, /inventory/adjustments, /inventory/count)
- État des stocks par emplacement
- Ajustements de stock (entrée/sortie manuelle)
- Comptage physique d'inventaire

### 11. Mouvements et transferts de stock
- Mouvements de stock (/stock-movements) : historique des entrées/sorties
- Transferts entre emplacements (/stock/transfers) : vers le bar, la cuisine, etc.

### 12. Caisse (/caisse)
- Ouverture et fermeture de session caisse
- Relevé de caisse : espèces, carte, crédit
- Historique des sessions

### 13. Dépenses (/expenses)
- Enregistrement des dépenses (catégorie, montant, date)
- Liste et filtrage des dépenses

### 14. Clients (/clients)
- Liste des clients avec solde crédit
- Création et modification de clients
- Limite de crédit par client

### 15. Gestion des crédits (/credit)
- Suivi des ventes à crédit par client
- Encaissement des échéances crédit

### 16. Personnel et Tables (/staff-tables)
- Gestion des serveurs
- Gestion des tables (numéro, section)

### 17. Finance (/finance)
- Vue d'ensemble financière (revenus, dépenses, crédits)

### 18. Rapports (/reports)
- Rapports de vente, stocks, activité

### 19. Paramètres (/settings)
- Configuration de l'établissement (nom, adresse, téléphone, email)
- Taux de taxe, devise et symbole monétaire
- Gestion des utilisateurs (création, modification, suppression, attribution des rôles)
- Permissions des menus par rôle

### 20. Annexes
- Types d'impression : ticket thermique (80mm), facture A4
- Gestion des secteurs (bar, cuisine, pâtisserie)
- Zones de stock (bar, cuisine, dépôt, zone de transition)

## Style attendu
- Langue : français clair et professionnel
- Pour chaque fonction : expliquer le but, puis donner les étapes d'utilisation
- Inclure des captures d'écran imaginaires marquées entre crochets, ex : `[Capture d'écran : écran de vente POS]`
- Utiliser une structure hiérarchique avec titres et sous-titres
- Longueur : environ 30-40 pages A4
- Public cible : gérant de restaurant/bar, caissiers, serveurs, chefs de cuisine (non techniques)
