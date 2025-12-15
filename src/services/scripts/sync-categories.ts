import { DataSource } from 'typeorm';
import { SERVICE_CATEGORIES, getCategorySlug } from '../config/service-categories.config';

/**
 * Sync service categories from code config to database
 * Run with: ts-node -r tsconfig-paths/register src/services/scripts/sync-categories.ts
 */
async function syncCategories() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false,
  });

  try {
    await dataSource.initialize();
    console.log('Database connected');

    for (const config of SERVICE_CATEGORIES) {
      const slug = getCategorySlug(config.name);
      
      await dataSource.query(
        `
        INSERT INTO service_categories (slug, description, type, display_order, is_active)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (slug) 
        DO UPDATE SET
          type = EXCLUDED.type,
          display_order = EXCLUDED.display_order,
          is_active = EXCLUDED.is_active
        `,
        [slug, config.name, config.type, config.displayOrder, true]
      );
      
      console.log(`✓ Synced category: ${config.name} (${slug})`);
    }

    console.log('\n✅ All categories synced successfully!');
  } catch (error) {
    console.error('❌ Error syncing categories:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

syncCategories();
