import { MigrationInterface, QueryRunner } from "typeorm";

export class OfertaNobre1758591914286 implements MigrationInterface {
    name = 'OfertaNobre1758591914286'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "oferta" ADD "nombre" character varying NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "oferta" DROP COLUMN "nombre"`);
    }

}
