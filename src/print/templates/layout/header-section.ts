import { Content } from 'pdfmake/interfaces';
import { DateFormatter } from 'src/print/helpers/helper';

const logo: Content = {
  image: 'src/assets/logo.png',
  width: 80,
  height: 80,
};

const currentDate: Content = {
  text: DateFormatter.getDDMMMMYYYY(new Date()),

  fontSize: 10,
};

interface HeaderOptions {
  title?: string;

  showLogo?: boolean;
  showDate?: boolean;
}

export const headerSection = (options: HeaderOptions): Content => {
  const { title, showLogo = true, showDate = true } = options;

  return {
    columns: [
      // Columna izquierda - Logo
      {
        width: 100,
        alignment: 'left',
        margin: [40, 40, 40, 0],
        stack: showLogo ? [logo] : [{ text: '' }], // Placeholder para mantener altura
      },
      // Columna central - Título
      {
        width: '*',

        alignment: 'center',
        margin: [50, 70, 0, 0], // Más margen superior para centrado vertical
        stack: title
          ? [
              {
                text: title,
                bold: true,
                fontSize: 18,
                alignment: 'center',
                
              },
            ]
          : [{ text: '' }], // Placeholder vacío
      },
      // Columna derecha - Fecha
      {
        width: 150,
        alignment: 'right',
        margin: [0, 70, 40, 0],
        stack: showDate ? [currentDate] : [{ text: '' }], // Placeholder vacío
      },
    ],
    
  };
};
