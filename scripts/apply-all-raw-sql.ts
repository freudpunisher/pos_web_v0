import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  console.log('Connected to PostgreSQL database');

  const drizzleDir = path.join(__dirname, '../drizzle');
  const files = fs.readdirSync(drizzleDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} SQL migration files to process.`);

  for (const file of files) {
    console.log(`\nProcessing file: ${file}`);
    const filePath = path.join(drizzleDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Drizzle splits SQL files with "--> statement-breakpoint"
    const statements = content.split('--> statement-breakpoint');

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (!stmt) continue;

      try {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        await client.query(stmt);
        console.log('Success');
      } catch (err: any) {
        const errMsg = err.message || '';
        const errCode = err.code || '';
        
        // Check if it's an "already exists" error
        const isAlreadyExists = 
          errCode === '42P07' || // duplicate_table
          errCode === '42710' || // duplicate_object (type or constraint)
          errCode === '42701' || // duplicate_column
          errMsg.toLowerCase().includes('already exists') ||
          errMsg.toLowerCase().includes('duplicate');

        if (isAlreadyExists) {
          console.log(`Skipped (already exists): ${errMsg.split('\n')[0]}`);
        } else {
          console.error(`Error executing statement: ${errMsg}`);
          console.error(`Statement: ${stmt}`);
          // We don't exit immediately so we can try to apply other statements
        }
      }
    }
  }

  // Also let's run the stockTransferItems table creation because it might not be in any migration file
  console.log('\nChecking if any schema-defined tables are missing...');
  try {
    // Let's execute create table for stock_transfer_items just in case
    await client.query(`
      CREATE TABLE IF NOT EXISTS "stock_transfer_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "transfer_id" uuid NOT NULL REFERENCES "stock_transfers"("id") ON DELETE CASCADE,
        "product_id" uuid NOT NULL REFERENCES "products"("id"),
        "quantity" integer NOT NULL
      );
    `);
    console.log('stock_transfer_items table verified/created.');
  } catch (err: any) {
    console.log('stock_transfer_items check:', err.message);
  }

  await client.end();
  console.log('\nAll done!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
