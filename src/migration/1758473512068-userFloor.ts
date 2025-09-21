import { MigrationInterface, QueryRunner } from "typeorm";

export class UserFloor1758473512068 implements MigrationInterface {
    name = 'UserFloor1758473512068'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "favorito" ("id" SERIAL NOT NULL, "fechaAgregado" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, "floorId" integer, CONSTRAINT "PK_c165646ddc8ebc0ce44b842b3cc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "favorito" ADD CONSTRAINT "FK_9638ec34191ec67c48319948448" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "favorito" ADD CONSTRAINT "FK_e3b5e93a747b21e2b9c6a506fe0" FOREIGN KEY ("floorId") REFERENCES "floor"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "favorito" DROP CONSTRAINT "FK_e3b5e93a747b21e2b9c6a506fe0"`);
        await queryRunner.query(`ALTER TABLE "favorito" DROP CONSTRAINT "FK_9638ec34191ec67c48319948448"`);
        await queryRunner.query(`DROP TABLE "favorito"`);
    }

}
