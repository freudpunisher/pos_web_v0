ALTER TABLE "products" ALTER COLUMN "stock" TYPE numeric(12, 6);
ALTER TABLE "products" ALTER COLUMN "stock" SET DEFAULT '0';

ALTER TABLE "stock" ALTER COLUMN "quantity_on_hand" TYPE numeric(12, 6);
ALTER TABLE "stock" ALTER COLUMN "quantity_on_hand" SET DEFAULT '0';
ALTER TABLE "stock" ALTER COLUMN "quantity_reserved" TYPE numeric(12, 6);
ALTER TABLE "stock" ALTER COLUMN "quantity_reserved" SET DEFAULT '0';
