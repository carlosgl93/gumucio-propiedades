const title = 'Gumucio Propiedades';

const email = 'gumuciopropiedades@gmail.com';

const repository = 'https://github.com/carlosgl93/gumucio-propiedades';
const phoneNumber = '+56 9 9783 0533';
const whatsappNumber = '56997830533';

const dateFormat = 'DD, MM, YYYY';

const loader = {
  // no more blinking in your app
  delay: 300, // if your asynchronous process is finished during 300 milliseconds you will not see the loader at all
  minimumLoading: 700, // but if it appears, it will stay for at least 700 milliseconds
};

const defaultMetaTags = {
  image: '/cover.png',
  description:
    'Arriendos y ventas de propiedades en Chile. Encuentra tu hogar ideal con Gumucio Propiedades.',
};

export {
  loader,
  dateFormat,
  repository,
  email,
  phoneNumber,
  whatsappNumber,
  title,
  defaultMetaTags,
};
