// Dati strutturati (schema.org) per Google: scheda dell'attivita' con indirizzo,
// contatti e orari del Centro. Parte dagli stessi dati del footer (site.ts, orari.ts),
// cosi' non ci sono due versioni da tenere allineate.
import { site, social } from '../data/site';
import { orari } from '../data/orari';

const GIORNI: Record<string, string> = {
	lun: 'Monday',
	mar: 'Tuesday',
	mer: 'Wednesday',
	gio: 'Thursday',
	ven: 'Friday',
	sab: 'Saturday',
	dom: 'Sunday',
};
const ORDINE = Object.keys(GIORNI);

// "Lun - Ven" (intervallo), "Lun - Mar - Gio" (elenco) o "Sabato" -> giorni schema.org.
function giorniDa(testo: string): string[] {
	const voci = testo.split('-').map((t) => t.trim().slice(0, 3).toLowerCase());
	if (voci.length === 2) return ORDINE.slice(ORDINE.indexOf(voci[0]), ORDINE.indexOf(voci[1]) + 1).map((g) => GIORNI[g]);
	return voci.map((g) => GIORNI[g]);
}

// "5.00 - 22.00" -> { opens: '05:00', closes: '22:00' }
function oreDa(testo: string) {
	const [a, b] = testo.split('-').map((t) => t.trim().replace('.', ':').padStart(5, '0'));
	return { opens: a, closes: b };
}

export function schedaAttivita(origin: string, immagine: string) {
	return {
		'@context': 'https://schema.org',
		'@type': 'SportsActivityLocation',
		'@id': `${origin}/#attivita`,
		name: site.name,
		legalName: site.legalName,
		url: `${origin}/`,
		image: immagine,
		logo: `${origin}/images/logo-body-energie-chiaro.png`,
		telephone: '+39 045 630 4337',
		email: site.email,
		vatID: `IT${site.vat}`,
		address: {
			'@type': 'PostalAddress',
			streetAddress: 'Via Adamello, 1',
			postalCode: '37069',
			addressLocality: 'Villafranca di Verona',
			addressRegion: 'VR',
			addressCountry: 'IT',
		},
		// Orari ordinari del Centro, dalla stessa fonte del footer (src/data/orari-apertura.json).
		openingHoursSpecification: orari[0].righe.map((r) => ({
			'@type': 'OpeningHoursSpecification',
			dayOfWeek: giorniDa(r.giorni),
			...oreDa(r.ore),
		})),
		sameAs: social.map((s) => s.href),
	};
}
