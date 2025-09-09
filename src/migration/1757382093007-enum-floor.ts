import { MigrationInterface, QueryRunner } from "typeorm";

export class EnumFloor1757382093007 implements MigrationInterface {
    name = 'EnumFloor1757382093007'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."floor_categoria_enum" RENAME TO "floor_categoria_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."floor_categoria_enum" AS ENUM('CAPTU', 'SUCULENTA')`);
        await queryRunner.query(`ALTER TABLE "floor" ALTER COLUMN "categoria" TYPE "public"."floor_categoria_enum" USING "categoria"::"text"::"public"."floor_categoria_enum"`);
        await queryRunner.query(`ALTER TABLE "floor" ALTER COLUMN "categoria" SET DEFAULT 'CAPTU'`);
        await queryRunner.query(`DROP TYPE "public"."floor_categoria_enum_old"`);
        await queryRunner.query(`ALTER TABLE "floor" ALTER COLUMN "categoria" SET DEFAULT 'CAPTU'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "floor" ALTER COLUMN "categoria" DROP DEFAULT`);
        await queryRunner.query(`CREATE TYPE "public"."floor_categoria_enum_old" AS ENUM('cactus', 'suculenta')`);
        await queryRunner.query(`ALTER TABLE "floor" ALTER COLUMN "categoria" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "floor" ALTER COLUMN "categoria" TYPE "public"."floor_categoria_enum_old" USING "categoria"::"text"::"public"."floor_categoria_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."floor_categoria_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."floor_categoria_enum_old" RENAME TO "floor_categoria_enum"`);
    }

}
