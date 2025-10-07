import { HttpException, HttpStatus } from '@nestjs/common';
import PdfPrinter from 'pdfmake';
import { PrintService } from './print.service';

// 📌 Mock de pdfmake y del objeto PDFKitDocument
jest.mock('pdfmake', () => {
  return jest.fn().mockImplementation(() => ({
    createPdfKitDocument: jest.fn(),
  }));
});

describe('PrintService', () => {
  let service: PrintService;
  let mockPdfPrinter: any;
  let mockPdfDoc: any;

  beforeEach(() => {
    mockPdfDoc = {
      on: jest.fn(),
      end: jest.fn(),
    };

    // Sobrescribimos el comportamiento del constructor de PdfPrinter
    (PdfPrinter as jest.Mock).mockImplementation(() => ({
      createPdfKitDocument: jest.fn().mockReturnValue(mockPdfDoc),
    }));

    service = new PrintService();
    mockPdfPrinter = (service as any).printer;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generatePdf', () => {
    it('should generate a PDF buffer successfully', async () => {
      const docDefinition = { content: ['Hello world'] };

      // Simulamos el flujo normal: "data" + "end"
      const mockBuffer = Buffer.from('PDF DATA');
      const dataCallbacks: any[] = [];
      const endCallbacks: any[] = [];

      mockPdfDoc.on.mockImplementation((event, callback) => {
        if (event === 'data') dataCallbacks.push(callback);
        if (event === 'end') endCallbacks.push(callback);
      });

      // Ejecutamos la función
      const pdfPromise = service.generatePdf(docDefinition);

      // Simulamos emisión de datos
      dataCallbacks.forEach((cb) => cb(mockBuffer));
      endCallbacks.forEach((cb) => cb());

      const result = await pdfPromise;

      expect(mockPdfPrinter.createPdfKitDocument).toHaveBeenCalledWith(docDefinition);
      expect(mockPdfDoc.end).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('PDF DATA');
    });
it('should reject if pdfDoc emits an error', async () => {
  const docDefinition = { content: ['Error test'] };
  const errorCallbacks: any[] = [];

  mockPdfDoc.on.mockImplementation((event, callback) => {
    if (event === 'error') errorCallbacks.push(callback);
  });

  const pdfPromise = service.generatePdf(docDefinition);

  // Simulamos un error emitido
  const error = new Error('PDF error');
  errorCallbacks.forEach((cb) => cb(error));

  // ✅ Esperamos el HttpException que lanza el catch
  await expect(pdfPromise).rejects.toBeInstanceOf(HttpException);
  await expect(pdfPromise).rejects.toMatchObject({
    response: {
      code: 'PDF_GENERATION_FAILED',
      message: 'Ocurrió un error generando el PDF',
      status: 500,
    },
  });
});


    it('should throw HttpException if something fails in try/catch', async () => {
      // Forzamos un error en createPdfKitDocument
      mockPdfPrinter.createPdfKitDocument.mockImplementation(() => {
        throw new Error('printer fail');
      });

      const docDefinition = { content: ['Error case'] };

      await expect(service.generatePdf(docDefinition)).rejects.toBeInstanceOf(HttpException);
      await expect(service.generatePdf(docDefinition)).rejects.toMatchObject({
        response: {
          code: 'PDF_GENERATION_FAILED',
          message: 'Ocurrió un error generando el PDF',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        },
      });
    });
  });
});
