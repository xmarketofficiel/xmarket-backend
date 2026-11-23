import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateContactEventsTable1704649200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'contact_events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'customerId',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'sellerId',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'serviceId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['contacted', 'completed', 'cancelled', 'no_response', 'follow_up_sent', 'rated'],
            default: "'contacted'",
          },
          {
            name: 'platform',
            type: 'varchar',
            default: "'whatsapp'",
          },
          {
            name: 'followUpSentAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'customerFeedback',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'contactedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create indexes for better query performance
    await queryRunner.createIndex(
      'contact_events',
      new TableIndex({
        name: 'IDX_CONTACT_CUSTOMER',
        columnNames: ['customerId'],
      })
    );

    await queryRunner.createIndex(
      'contact_events',
      new TableIndex({
        name: 'IDX_CONTACT_SELLER',
        columnNames: ['sellerId'],
      })
    );

    await queryRunner.createIndex(
      'contact_events',
      new TableIndex({
        name: 'IDX_CONTACT_SERVICE',
        columnNames: ['serviceId'],
      })
    );

    await queryRunner.createIndex(
      'contact_events',
      new TableIndex({
        name: 'IDX_CONTACT_CONTACTED_AT',
        columnNames: ['contactedAt'],
      })
    );

    await queryRunner.createIndex(
      'contact_events',
      new TableIndex({
        name: 'IDX_CONTACT_STATUS',
        columnNames: ['status'],
      })
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'contact_events',
      new TableForeignKey({
        columnNames: ['customerId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'contact_events',
      new TableForeignKey({
        columnNames: ['sellerId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'contact_events',
      new TableForeignKey({
        columnNames: ['serviceId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'services',
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('contact_events');
  }
}
