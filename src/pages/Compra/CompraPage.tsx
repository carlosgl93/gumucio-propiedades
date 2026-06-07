import { PropertyListView } from '@/components/PropertyListView';

export const CompraPage = () => (
  <PropertyListView
    title="PROPIEDADES EN VENTA"
    type="sale"
    showWhatsAppCTA={true}
    ctaMessage="Hola! Estoy buscando una propiedad para comprar. ¿Podrían ayudarme?"
  />
);

export default CompraPage;
