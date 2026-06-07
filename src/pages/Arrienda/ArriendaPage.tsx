import { PropertyListView } from '@/components/PropertyListView';

export const ArriendaPage = () => (
  <PropertyListView
    title="PROPIEDADES EN ARRIENDO"
    type="rent"
    showWhatsAppCTA={true}
    ctaMessage="Hola! Estoy buscando una propiedad para arrendar. ¿Podrían ayudarme?"
  />
);

export default ArriendaPage;
