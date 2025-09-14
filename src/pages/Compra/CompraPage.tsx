import { PropertyListView } from '@/components/PropertyListView';
import { useProperties } from '@/hooks/useProperties';

export const CompraPage = () => {
  const { data: properties = [], isLoading } = useProperties();

  // Filter properties for sale
  const saleProperties = properties.filter(
    (property) => property.type === 'sale' && property.isActive,
  );

  return (
    <PropertyListView
      title="PROPIEDADES EN VENTA"
      properties={saleProperties}
      isLoading={isLoading}
      showWhatsAppCTA={true}
      ctaMessage="Hola! Estoy buscando una propiedad para comprar. ¿Podrían ayudarme?"
    />
  );
};

export default CompraPage;
