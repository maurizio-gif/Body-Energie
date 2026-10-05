// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

const isVercel = !!process.env.VERCEL;
/** @param {string} v */
const senzaSlashFinale = (v) => v.replace(/\/+$/, '');

const sitoProduzione = process.env.SITE_URL ? senzaSlashFinale(process.env.SITE_URL) : null;
const sitoVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
const site = sitoProduzione ?? (isVercel && sitoVercel ? `https://${sitoVercel}` : 'https://www.bodyenergie.it');

if (!sitoProduzione) {
	console.warn('[body-energie] SITE_URL non impostata: build di prova su ' + site);
}

// 301 dal vecchio sito WordPress (bodyenergie.it), estratti dal plugin Redirection.
// Quelle che nel vecchio sito puntavano a "/promo", "/abbonamenti" o "referral" (pagine non
// presenti nel backup) vanno alla home: sono promozioni scadute o acquisti online non piu' attivi.
const redirectWordpress = {
	'/contatti/': '/',
	'/body-energie-villafranca-di-verona/': '/',
	'/personal-trainer-verona/': '/personal-training',
	'/classes-list/': '/',
	'/gallery/': '/',
	'/classes/': '/',
	'/news/': '/', // promozione scaduta: alla home
	'/about/': '/',
	'/home-backup/': '/',
	'/openpass7gg/': '/', // promozione scaduta: alla home
	'/aitrevolti-ristobar/': '/',
	'/estetica/': '/centro-estetico',
	'/compleanni-verona/': '/', // promozione scaduta: alla home
	'/corporate-wellness/': '/',
	'/orari-body-energie/': '/orari',
	'/allenamento-body-energie/': '/corsi-fitness',
	'/partners/': '/', // promozione scaduta: alla home
	'/iorestoacasa/': '/', // promozione scaduta: alla home
	'/acquista-servizi/': '/', // acquisto online non piu' attivo: alla home (gli abbonamenti si chiedono dal modulo)
	'/carrello/': '/', // acquisto online non piu' attivo: alla home (gli abbonamenti si chiedono dal modulo)
	'/checkout/': '/', // acquisto online non piu' attivo: alla home (gli abbonamenti si chiedono dal modulo)
	'/acquista-servizi/small-group-personal-trainer/': '/', // acquisto online non piu' attivo: alla home (gli abbonamenti si chiedono dal modulo)
	'/area-riservata/': '/',
	'/privacy-policy/': '/privacy-body-energie',
	'/home-backup-30-06-20/': '/',
	'/prova1/': '/',
	'/prova2/': '/',
	'/prevendita-re-opening-body-energie/': '/',
	'/nutri-energie-la-nutrizione-consapevole/': '/',
	'/acquista-servizi-new/': '/', // acquisto online non piu' attivo: alla home (gli abbonamenti si chiedono dal modulo)
	'/condizioni-di-vendita/': '/wp-content/uploads/2025/12/Regolamento-Body-Energie.pdf',
	'/la-corsa-delle-renne-concorso-natale-2021/': '/', // promozione scaduta: alla home
	'/catalogo-premi-concorso-la-corsa-delle-renne/': '/', // promozione scaduta: alla home
	'/1-mese-in-regalo/': '/', // promozione scaduta: alla home
	'/1-mese-in-regalo-1/': '/', // promozione scaduta: alla home
	'/porte-aperte-bodyenergie-s/': '/', // promozione scaduta: alla home
	'/presentaci-un-tuo-amico/': '/', // iniziativa "presenta un amico" conclusa: alla home
	'/presenta-un-amico/': '/', // iniziativa "presenta un amico" conclusa: alla home
	'/body-lab-palestra-della-salute/': '/body-lab',
	'/porte-aperte-bodyenergie-f/': '/', // promozione scaduta: alla home
	'/privacy-policy-2/': '/privacy-body-energie',
	'/cookie-policy/': '/privacy-body-energie',
	'/orari-corsi-body-energie/': '/orari',
	'/regala-1-mese-ai-tuoi-amici/': '/', // iniziativa "presenta un amico" conclusa: alla home
	'/porte-aperte-inseguiituoisogni/': '/', // promozione scaduta: alla home
	'/buon-compleanno/': '/', // promozione scaduta: alla home
	'/buon-compleanno-2/': '/', // promozione scaduta: alla home
	'/regala-1-settimana-di-fitness/': '/', // promozione scaduta: alla home
	'/fitness-piacere-puro/': '/', // promozione scaduta: alla home
	'/fitness-piacere-puro-2/': '/', // promozione scaduta: alla home
	'/estate-voglia-di-liberta/': '/', // promozione scaduta: alla home
	'/happy-valentines-day/': '/', // promozione scaduta: alla home
	'/condizioni-generali/': '/wp-content/uploads/2025/12/Regolamento-Body-Energie.pdf',
	'/open-day-13-gennaio-2025/': '/', // promozione scaduta: alla home
	'/newsletter-2/': '/',
	'/backup-home-aprile2025/': '/',
	'/test/': '/',
	'/open-pass/': '/', // promozione scaduta: alla home
	'/free-pass-body-energie/': '/', // promozione scaduta: alla home
	'/safeguarding-body-energie/': '/', // promozione scaduta: alla home
	'/test-form/': '/',
	'/planning/': '/wp-content/uploads/2026/04/ORARIO-CORSI-2016-sito.pdf',
	'/contributo-regione-veneto-body-energie/': '/contributo-regione-veneto/',
};

// https://astro.build/config
export default defineConfig({
	site,
	redirects: {
		...redirectWordpress,
	},
	integrations: [sitemap()],
	adapter: vercel(),
	devToolbar: { enabled: false },
	// CSS dentro l'HTML: niente richieste che bloccano il primo rendering (circa 12 KB compressi per pagina).
	build: { inlineStylesheets: 'always' },
	server: { port: Number(process.env.PORT) || 4321 },
});
