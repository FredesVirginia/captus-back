import { MigrationInterface, QueryRunner } from "typeorm";

export class PlantaComboOferta1758383289031 implements MigrationInterface {
    name = 'PlantaComboOferta1758383289031'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "oferta" ("id" SERIAL NOT NULL, "descuento" numeric(5,2) NOT NULL, "fechaInicio" TIMESTAMP NOT NULL, "fechaFin" TIMESTAMP NOT NULL, CONSTRAINT "PK_940cb32b570d1a9882e73bdaa10" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "combo" ("id" SERIAL NOT NULL, "nombre" character varying(100) NOT NULL, "descripcion" text, "precio" numeric(10,2) NOT NULL, "activo" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_7f13547266097aa634ddefd34f9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "combo_item" ("id" SERIAL NOT NULL, "cantidad" integer NOT NULL, "comboId" integer, "plantaId" integer, CONSTRAINT "PK_adb6455f8fabc75656764672d88" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "floor" ADD "ofertaId" integer`);
        await queryRunner.query(`ALTER TABLE "combo_item" ADD CONSTRAINT "FK_d18c56a6186aba174d286364ee5" FOREIGN KEY ("comboId") REFERENCES "combo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "combo_item" ADD CONSTRAINT "FK_27089b498a7ec8bd7523214bb67" FOREIGN KEY ("plantaId") REFERENCES "floor"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "floor" ADD CONSTRAINT "FK_563db28dab6c5e3dc13e5d083dd" FOREIGN KEY ("ofertaId") REFERENCES "oferta"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "floor" DROP CONSTRAINT "FK_563db28dab6c5e3dc13e5d083dd"`);
        await queryRunner.query(`ALTER TABLE "combo_item" DROP CONSTRAINT "FK_27089b498a7ec8bd7523214bb67"`);
        await queryRunner.query(`ALTER TABLE "combo_item" DROP CONSTRAINT "FK_d18c56a6186aba174d286364ee5"`);
        await queryRunner.query(`ALTER TABLE "floor" DROP COLUMN "ofertaId"`);
        await queryRunner.query(`DROP TABLE "combo_item"`);
        await queryRunner.query(`DROP TABLE "combo"`);
        await queryRunner.query(`DROP TABLE "oferta"`);
    }

}
