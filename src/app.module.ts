import { Logger, Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { FloorsModule } from './floors/floors.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envs } from './config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrderModule } from './order/order.module';
import { PrintModule } from './print/print.module';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from './mailer/mailer.module';



@Module({
  imports: [UsersModule, FloorsModule, PaymentsModule, ReportsModule , 
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: envs.dbHost,
      port: envs.port,
      username: envs.dbUser,
      password: envs.dbPassword,
      database: envs.dbName,
      // entities: [User , Review],
      autoLoadEntities: true,
      entities: ['dist/**/*.entity{.ts,.js}'],
      migrations: ['dist/migration/*.js'],
      synchronize: true,
    }), OrderModule, PrintModule,
     ConfigModule.forRoot({
      isGlobal: true, // 👈 hace que esté disponible en toda la app sin volver a importarlo
      envFilePath: '.env', // 👈 asegúrate de que apunta al archivo correcto
    }),
     MailModule,
  
  ],

    providers: [
   

   // Servicio adicional para verificar la conexión
    {
      provide: 'DATABASE_CONNECTION_LOGGER',
      useFactory: async () => {
        const logger = new Logger('Database');

        setTimeout(() => {
          logger.log(
            `🗄️  Conectado a PostgreSQL en: ${envs.dbHost}:${envs.port}/${envs.dbName}`,
          );
          logger.debug('✅ ¡Conexión exitosa!');
        }, 1000);
      },
    },
   

    AppService,
  ],

    controllers: [AppController],
   
 
})
export class AppModule {}
