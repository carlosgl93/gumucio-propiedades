import { PropertyListView } from '@/components/PropertyListView';
import { useProperties } from '@/hooks/useProperties';

export const ArriendaPage = () => {
  const { data: properties = [], isLoading } = useProperties();

  // Filter properties for rent
  const rentProperties = properties.filter(
    (property) => property.type === 'rent' && property.isActive,
  );

  return (
    <PropertyListView
      title="PROPIEDADES EN ARRIENDO"
      properties={rentProperties}
      isLoading={isLoading}
      showWhatsAppCTA={true}
      ctaMessage="Hola! Estoy buscando una propiedad para arrendar. ¿Podrían ayudarme?"
    />
  );
};

export default ArriendaPage;
