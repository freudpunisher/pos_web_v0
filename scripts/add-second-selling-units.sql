-- Ajoute une 2e unité de vente (Carton) à des produits déjà vendus à la pièce.
-- L'unité par défaut (Pièce, facteur 1) reste la base du stock en base.
-- conversion_factor = nombre de pièces contenues dans un carton.
-- Idempotent : la garde NOT EXISTS empêche toute ré-exécution d'ajouter des doublons.
-- Prix indicatifs (= prix pièce x contenu du carton) à ajuster si besoin.

-- 1) Bavaria 60.000 FC/pièce -> carton de 12 = 720.000 FC
INSERT INTO product_selling_units (product_id, name, unit_id, price, conversion_factor, is_default, sort_order)
SELECT p.id,
       'Carton',
       (SELECT id FROM measurement_units WHERE name = 'Carton' LIMIT 1),
       '720000.00',
       '12',
       false,
       1
FROM products p
WHERE p.sku = 'BVS-003'
  AND NOT EXISTS (SELECT 1 FROM product_selling_units su WHERE su.product_id = p.id AND su.name = 'Carton');

-- 2) Huile A1 76.800 FC/pièce -> carton de 12 = 921.600 FC
INSERT INTO product_selling_units (product_id, name, unit_id, price, conversion_factor, is_default, sort_order)
SELECT p.id,
       'Carton',
       (SELECT id FROM measurement_units WHERE name = 'Carton' LIMIT 1),
       '921600.00',
       '12',
       false,
       1
FROM products p
WHERE p.sku = 'EPI-004'
  AND NOT EXISTS (SELECT 1 FROM product_selling_units su WHERE su.product_id = p.id AND su.name = 'Carton');

-- 3) Big jus 24.000 FC/pièce -> carton de 12 = 288.000 FC
INSERT INTO product_selling_units (product_id, name, unit_id, price, conversion_factor, is_default, sort_order)
SELECT p.id,
       'Carton',
       (SELECT id FROM measurement_units WHERE name = 'Carton' LIMIT 1),
       '288000.00',
       '12',
       false,
       1
FROM products p
WHERE p.sku = 'BVS-004'
  AND NOT EXISTS (SELECT 1 FROM product_selling_units su WHERE su.product_id = p.id AND su.name = 'Carton');

-- 4) Drosdy 5l 43.200 FC/pièce -> carton de 4 = 172.800 FC
INSERT INTO product_selling_units (product_id, name, unit_id, price, conversion_factor, is_default, sort_order)
SELECT p.id,
       'Carton',
       (SELECT id FROM measurement_units WHERE name = 'Carton' LIMIT 1),
       '172800.00',
       '4',
       false,
       1
FROM products p
WHERE p.sku = 'BVS-005'
  AND NOT EXISTS (SELECT 1 FROM product_selling_units su WHERE su.product_id = p.id AND su.name = 'Carton');

-- Vérification : produits désormais à 2 unités
SELECT p.sku, p.name,
       string_agg(su.name || ' x' || su.conversion_factor || ' (' || su.price || ')', ' | ' ORDER BY su.sort_order) AS unites
FROM product_selling_units su
JOIN products p ON p.id = su.product_id
WHERE p.sku IN ('BVS-003', 'EPI-004', 'BVS-004', 'BVS-005')
GROUP BY p.sku, p.name
ORDER BY p.sku;