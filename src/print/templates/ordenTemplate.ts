import { Orden } from 'src/order/entity/order.entity';
import { fetchImageAsBase64 } from '../helpers/helper';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { headerSection } from './layout/header-section';
import { styleText } from 'util';
export async function buildOrderTemplate(order: Orden) : Promise<TDocumentDefinitions> {
  return {
   pageMargins: [40, 100, 40, 60],
    header: headerSection({ showLogo: true, showDate: true  , title : "Confirmación de Orden" }),
    content: [
  
      { text: `Nombre de Cliente: ${order.user.nombre} . Fecha de Compra: ${order.fecha.toLocaleDateString()}`, style: 'subheader' },
      { text: `Telefono: + ${order.user.phone} `, style: 'textUser' },
     
      {
        table: {
          widths: ['auto', '*', 'auto','auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Imagen', style: 'tableHeader' },
              { text: 'Planta', style: 'tableHeader' },
               { text: 'Id', style: 'tableHeader' },
              { text: 'Cantidad', style: 'tableHeader' },
              { text: 'Precio Unitario', style: 'tableHeader' },
              { text: 'Subtotal', style: 'tableHeader' },
            ],
            ...(await Promise.all(
              order.items.map(async (item) => [
                {
                  image: await fetchImageAsBase64(item.planta.imagenUrl),
                  fit: [150, 250],
                },
               { text: item.planta.nombre, style: 'tableBody' },
                { text: item.id, style: 'tableBody' },
                { text: item.cantidad, style: 'tableBody' },
                { text: `$${item.precioUnitario}`, style: 'tableBody' },
                { text: `$${item.cantidad * Number(item.precioUnitario)}`, style: 'tableBody' },
              ]),
            )),
          ],
        },
      },

      { text: `\nTotal: $${order.total}`, style: 'total' },
    ],
    styles: {
      textUser: { fontSize: 14, bold :true, alignment : "left" , marginBottom : 10 ,  },
      subheader: { fontSize: 14, bold :true, alignment : "left" , marginBottom : 10 , marginTop:40 },
      tableHeader: { bold: true, fillColor: '#eeeeee' },
      tableBody: { bold: true },
      total: { bold: true, fontSize: 16, alignment: 'right' },
    },
  };
}
