import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCovoiturageLocations1734448000000 implements MigrationInterface {
    name = 'AddCovoiturageLocations1734448000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add from_location and to_location columns to services table
        await queryRunner.query(`
            ALTER TABLE "services" 
            ADD COLUMN "from_location" varchar,
            ADD COLUMN "to_location" varchar
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove from_location and to_location columns from services table
        await queryRunner.query(`
            ALTER TABLE "services"
            DROP COLUMN "to_location",
            DROP COLUMN "from_location"
        `);
    }
}
