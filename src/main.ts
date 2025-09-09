import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({
    transform: true, // <- esto hace la transformación automática
  }));

    app.enableCors(); 
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();



// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import { ValidationPipe } from '@nestjs/common';
// import { ExpressAdapter } from '@nestjs/platform-express';
// import express from 'express';

// async function bootstrap() {
//   const server = express();
//   const app = await NestFactory.create(
//     AppModule,
//     new ExpressAdapter(server),
//   );
//   app.useGlobalPipes(new ValidationPipe());
//   app.enableCors();

//   await app.init(); // importante para función serverless

//   return server; // devolver instancia express para exportar
// }

// // Exportar la instancia Express que Vercel usará para atender requests
// export default bootstrap();