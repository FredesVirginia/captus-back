import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import PdfPrinter from 'pdfmake';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
@Injectable()
export class PrintService {
  private printer: PdfPrinter;

  constructor() {
    const fonts = {
      Roboto: {
        normal: 'src/fonts/static/Roboto_Condensed-Light.ttf',
        bold: 'src/fonts/static/Roboto_Condensed-Bold.ttf',
        italics: 'src/fonts/static/Roboto_Condensed-Italic.ttf',
       
      },
    };

    this.printer = new PdfPrinter(fonts);
  }

async generatePdf(docDefinition: TDocumentDefinitions): Promise<Buffer> {
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
      const chunks: Buffer[] = [];

      pdfDoc.on('data', (chunk) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', (err) => reject(err));

      pdfDoc.end();
    });
  } catch (error) {
    console.error('❌ Error generando PDF:', error);

    throw new HttpException(
      {
        code: 'PDF_GENERATION_FAILED',
        message: 'Ocurrió un error generando el PDF',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}


}
