import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdminFieldsToItemsAndUsers1693440000000 implements MigrationInterface {
    name = 'AddAdminFieldsToItemsAndUsers1693440000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add admin fields to items table
        await queryRunner.query(`
            ALTER TABLE "items" 
            ADD COLUMN "is_featured" boolean DEFAULT false,
            ADD COLUMN "approved_at" timestamp,
            ADD COLUMN "approved_by" integer,
            ADD COLUMN "rejected_at" timestamp,
            ADD COLUMN "rejected_by" integer,
            ADD COLUMN "rejection_reason" text,
            ADD COLUMN "featured_at" timestamp,
            ADD COLUMN "featured_by" integer
        `);

        // Add admin fields to users table
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD COLUMN "suspended_until" timestamp,
            ADD COLUMN "suspension_reason" text,
            ADD COLUMN "suspended_by" integer,
            ADD COLUMN "suspended_at" timestamp
        `);

        // Create indexes for performance
        await queryRunner.query(`CREATE INDEX "IDX_items_is_featured" ON "items" ("is_featured")`);
        await queryRunner.query(`CREATE INDEX "IDX_items_approved_at" ON "items" ("approved_at")`);
        await queryRunner.query(`CREATE INDEX "IDX_users_status" ON "users" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_users_suspended_until" ON "users" ("suspended_until")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove indexes
        await queryRunner.query(`DROP INDEX "IDX_users_suspended_until"`);
        await queryRunner.query(`DROP INDEX "IDX_users_status"`);
        await queryRunner.query(`DROP INDEX "IDX_items_approved_at"`);
        await queryRunner.query(`DROP INDEX "IDX_items_is_featured"`);

        // Remove admin fields from users table
        await queryRunner.query(`
            ALTER TABLE "users"
            DROP COLUMN "suspended_at",
            DROP COLUMN "suspended_by",
            DROP COLUMN "suspension_reason",
            DROP COLUMN "suspended_until"
        `);

        // Remove admin fields from items table
        await queryRunner.query(`
            ALTER TABLE "items"
            DROP COLUMN "featured_by",
            DROP COLUMN "featured_at",
            DROP COLUMN "rejection_reason",
            DROP COLUMN "rejected_by",
            DROP COLUMN "rejected_at",
            DROP COLUMN "approved_by",
            DROP COLUMN "approved_at",
            DROP COLUMN "is_featured"
        `);
    }
}
