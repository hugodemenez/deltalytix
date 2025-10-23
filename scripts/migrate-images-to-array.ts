/**
 * Migration script to populate the new images array field from legacy imageBase64 fields
 *
 * This script migrates data from:
 * - imageBase64 (legacy first image field)
 * - imageBase64Second (legacy second image field)
 *
 * To:
 * - images (new array field)
 *
 * The legacy fields are kept for backward compatibility.
 *
 * Usage: npx ts-node scripts/migrate-images-to-array.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateImagesToArray() {
  console.log('Starting migration of images to array field...\n');

  try {
    // Find all trades that have legacy image fields but empty images array
    const tradesToMigrate = await prisma.trade.findMany({
      where: {
        OR: [
          { imageBase64: { not: null } },
          { imageBase64Second: { not: null } }
        ],
        // Only migrate if images array is empty
        images: { isEmpty: true }
      },
      select: {
        id: true,
        imageBase64: true,
        imageBase64Second: true,
        images: true,
      }
    });

    console.log(`Found ${tradesToMigrate.length} trades to migrate\n`);

    if (tradesToMigrate.length === 0) {
      console.log('No trades need migration. Exiting.');
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ tradeId: string; error: string }> = [];

    // Process each trade
    for (const trade of tradesToMigrate) {
      try {
        // Build images array from legacy fields
        const imagesArray: string[] = [];

        if (trade.imageBase64) {
          imagesArray.push(trade.imageBase64);
        }

        if (trade.imageBase64Second) {
          imagesArray.push(trade.imageBase64Second);
        }

        // Update the trade with the new images array
        await prisma.trade.update({
          where: { id: trade.id },
          data: {
            images: imagesArray
          }
        });

        successCount++;

        // Log progress every 100 trades
        if (successCount % 100 === 0) {
          console.log(`Progress: ${successCount}/${tradesToMigrate.length} trades migrated`);
        }
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({
          tradeId: trade.id,
          error: errorMessage
        });
        console.error(`Error migrating trade ${trade.id}: ${errorMessage}`);
      }
    }

    // Print summary
    console.log('\n=== Migration Summary ===');
    console.log(`Total trades processed: ${tradesToMigrate.length}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Errors: ${errorCount}`);

    if (errors.length > 0) {
      console.log('\n=== Errors ===');
      errors.forEach(({ tradeId, error }) => {
        console.log(`Trade ID: ${tradeId}, Error: ${error}`);
      });
    }

    console.log('\nMigration completed!');
  } catch (error) {
    console.error('Fatal error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateImagesToArray()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
