import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Si es un error conocido de Nest (HttpException)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

     
      let result: any = {
        code: 'UNKNOWN_ERROR',
        status,
      };

      
      if (
        typeof res === 'object' &&
        (res as any)['message'] &&
        Array.isArray((res as any)['message'])
      ) {
        result = {
          code: 'VALIDATION_ERROR',
          status,
          errors: (res as any)['message'],
        };
      } else if (typeof res === 'object') {
        // Errores normales con code y status (como tus AuthException)
        result = res;
      } else {
        // Otros errores simples
        result = {
          code: 'INTERNAL_ERROR',
          status,
          message: res,
        };
      }

      return response.status(status).json(result);
    }

    // ⚠️ Si es un error desconocido o no HttpException
    console.error('Unhandled error:', exception);

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
      message: 'An unexpected error occurred',
    });
  }
}
