export type OrderWithItems = {
  id: number;
  items: {
    id: number;
    planta: {
      id: number;
      nombre: string;
      descripcion: string;
      categoria: string;
      precio: string;
      stock: number;
      imagenUrl: string;
    };
    cantidad: number;
    precioUnitario: string;
  }[];
};
