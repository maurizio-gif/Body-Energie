// Converte le schede corso estratte dal vecchio sito (JSON Elementor) in dati
// puliti per il template "corso": src/data/pagine/<slug>.json.
//
// Uso:  node scripts/migrazione/normalizza-corsi.mjs <cartella-estratta> [cartella-output]
// (la cartella estratta e' l'output di estrai-pagine.mjs)
//
// Fedelta' ai contenuti: i testi restano quelli del sito originale (solo
// ripuliti dagli stili Elementor). Le risposte delle FAQ erano segnaposto
// ("Lorem ipsum") in tutte le pagine: non vengono portate, risposta = null.
import fs from 'node:fs';
import path from 'node:path';
import { strip, percorso, pulisci, widgets, maiuscoleIniziali, etichetta, heroDa } from './lib.mjs';

const [, , IN, OUT = 'src/data/pagine'] = process.argv;
if (!IN) {
	console.error('Uso: node normalizza-corsi.mjs <cartella-estratta> [cartella-output]');
	process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });

const CORSI = [
	'acqua', 'back-school', 'balance', 'balance-2', 'body-pump-body-energie', 'functional-training-body-energie',
	'group-cycling', 'pilates-matwork', 'pilates-reformer', 'powerlifting-body-energie', 'step-body-energie',
	'strenght-development', 'technogym-ride', 'trx-3', 'yoga', 'zumba-body-energie',
];

function blocco(sez) {
	const ws = widgets(sez);
	const b = { titolo: null, sottotitolo: null, descrizioneHtml: '', video: null, dettagli: [], portareTitolo: null, portare: [], intensita: [] };
	ws.forEach((w, i) => {
		const s = w.settings || {};
		switch (w.widgetType) {
			case 'heading': {
				const testo = strip(s.title);
				if (!testo) break;
				if (ws[i + 1]?.widgetType === 'progress') {
					b._etichetta = etichetta(testo);
				} else if (s.header_size === 'h3') {
					b.portareTitolo = etichetta(testo);
				} else if (!b.titolo) {
					b.titolo = testo;
				} else if (!b.descrizioneHtml) {
					b.sottotitolo = testo;
				}
				break;
			}
			case 'text-editor':
				b.descrizioneHtml += pulisci(s.editor);
				break;
			case 'icon-list':
				for (const it of s.icon_list || []) b.dettagli.push({ testo: strip(it.text), icona: it.selected_icon?.value || null });
				break;
			case 'image-box':
				b.portare.push({ etichetta: strip(s.title_text), immagine: percorso(s.image?.url) });
				break;
			case 'video':
				b.video = percorso(s.hosted_url?.url || null);
				break;
			case 'progress':
				// Elementor non salva i valori predefiniti: una barra senza "percent" vale 50.
				b.intensita.push({ etichetta: b._etichetta, valore: Number(s.percent?.size ?? 50) });
				b._etichetta = null;
				break;
		}
	});
	delete b._etichetta;
	return b;
}

const indice = [];
for (const slug of CORSI) {
	const d = JSON.parse(fs.readFileSync(path.join(IN, slug + '.json'), 'utf8'));
	const el = d.elementorData;
	const hero = el[0];
	// FAQ: nel vecchio sito le risposte erano "Lorem ipsum" (segnaposto): il sito non le ha.
	const accContainer = el.find((sec) => widgets(sec).some((w) => w.widgetType === 'nested-accordion')) ?? el[el.length - 1];

	// Galleria: la sola pagina "acqua" ha un carosello di foto della piscina.
	const carosello = el
		.flatMap((sec) => widgets(sec))
		.find((w) => w.widgetType === 'media-carousel');
	const galleria = carosello ? (carosello.settings.slides || []).map((sl) => percorso(sl.image?.url)).filter(Boolean) : [];

	const blocchi = el
		.slice(1)
		.filter((sec) => sec !== accContainer)
		.map(blocco)
		.filter((b) => b.titolo && (b.descrizioneHtml || b.video));

	// Sigle che la maiuscola iniziale rovinerebbe.
	const NOMI = { 'trx-3': 'TRX' };
	const nomePagina = NOMI[slug] ?? maiuscoleIniziali(blocchi[0].titolo);
	const testoPiano = strip(blocchi[0].descrizioneHtml);
	const descrizioneSeo = testoPiano.length > 155 ? testoPiano.slice(0, 155).replace(/\s+\S*$/, '') + '…' : testoPiano;

	const pagina = {
		tipo: 'corso',
		slug,
		nome: nomePagina,
		// Il vecchio sito non aveva titoli/descrizioni SEO personalizzati (solo i
		// default di Yoast): questi sono generati col formato gia' usato su /sala-pesi.
		seo: { title: `${nomePagina} - Body Energie | Villafranca di Verona`, description: descrizioneSeo },
		hero: heroDa(hero),
		galleria,
		blocchi,
	};
	fs.writeFileSync(path.join(OUT, slug + '.json'), JSON.stringify(pagina, null, '\t') + '\n');
	indice.push({ slug, blocchi: blocchi.length, video: blocchi.filter((b) => b.video).length, barre: blocchi.reduce((n, b) => n + b.intensita.length, 0) });
}
console.table(indice);
