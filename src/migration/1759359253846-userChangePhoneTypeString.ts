import { MigrationInterface, QueryRunner } from "typeorm";

export class UserChangePhoneTypeString1759359253846 implements MigrationInterface {
    name = 'UserChangePhoneTypeString1759359253846'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "phone" character varying NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "phone" integer NOT NULL DEFAULT '0'`);
    }

}
