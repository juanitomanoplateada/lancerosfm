import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageHeader } from '../../layout/page-header/page-header';
import { PageMetadata } from '../../seo/page-metadata';
import { breadcrumbSchema } from '../../seo/structured-data';
import { STATION, WHATSAPP_URL } from '../../station/station';

interface Faq {
  question: string;
  answer: string;
}

/**
 * Página de preguntas frecuentes.
 *
 * Además de resolver dudas reales, es la que más posibilidades tiene de aparecer
 * en Google con respuestas desplegadas: las preguntas se publican también como
 * datos estructurados FAQPage, generados desde la misma lista que se ve en
 * pantalla para que no puedan quedar desincronizadas.
 */
@Component({
  selector: 'app-how-to-listen',
  imports: [PageHeader, RouterLink],
  templateUrl: './how-to-listen.html',
  styleUrl: './how-to-listen.scss',
})
export class HowToListen {
  protected readonly station = STATION;
  protected readonly whatsappUrl = WHATSAPP_URL;

  protected readonly faqs: readonly Faq[] = [
    {
      question: '¿Cuánto cuesta escuchar la emisora por internet?',
      answer:
        'Nada. Escuchar en lancerosfm.com es gratis. Lo único que gastas son los datos de tu plan, igual que cuando ves un video o escuchas música en línea.',
    },
    {
      question: '¿Cuántos datos gasta una hora de emisora?',
      answer:
        'Entre 60 y 70 megas por hora, aproximadamente. Si estás conectado al wifi de la casa, no gastas datos del plan.',
    },
    {
      question: '¿Puedo escuchar desde otra ciudad o desde el exterior?',
      answer:
        'Sí. La señal de 94.1 FM llega hasta donde alcanza la antena, pero por internet la emisora se escucha desde cualquier parte del mundo, con la misma calidad.',
    },
    {
      question: '¿Cómo dejo la emisora en la pantalla de inicio del celular?',
      answer:
        'Abre lancerosfm.com en el navegador del celular y busca la opción «Agregar a la pantalla de inicio» o «Instalar aplicación» en el menú. Queda un icono igual al de cualquier aplicación y abre directo en el reproductor.',
    },
    {
      question: '¿Por qué se corta el sonido a veces?',
      answer:
        'Casi siempre es la conexión a internet. El reproductor se reconecta solo en cuanto vuelve la señal, así que no hace falta recargar la página ni volver a entrar.',
    },
    {
      question: '¿Cómo pido una canción o mando un saludo?',
      answer: `Escríbenos por WhatsApp al ${STATION.contact.phoneDisplay} con la canción y el saludo que quieres mandar.`,
    },
    {
      question: '¿En qué dial sintonizo la emisora en el radio?',
      answer: `En el 94.1 de la FM, en ${STATION.address.city} y los municipios vecinos de ${STATION.address.region}.`,
    },
  ];

  constructor() {
    const pageMetadata = inject(PageMetadata);

    pageMetadata.setPage({
      path: '/como-escuchar',
      title: 'Cómo escucharnos en vivo',
      description:
        'En el radio, en el celular, en el computador o en el carro: todas las formas de escuchar Lanceros Stereo 94.1 FM de Tuta, Boyacá, y las preguntas más frecuentes.',
    });

    pageMetadata.setStructuredData(
      'ruta',
      breadcrumbSchema([
        { name: 'Inicio', path: '/' },
        { name: 'Cómo escuchar', path: '/como-escuchar' },
      ]),
    );

    pageMetadata.setStructuredData('faq', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: this.faqs.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    });
  }
}
