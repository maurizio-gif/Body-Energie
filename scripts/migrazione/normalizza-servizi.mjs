// Converte le altre pagine del vecchio sito (JSON Elementor) in dati puliti:
//   - pagine "servizio" (sala pesi, personal training, termario, nuoto, body camp,
//     ciclismo, centro estetico, body lab)  -> tipo "servizio"
//   - elenco dei corsi fitness     -> tipo "elenco"
//   - pagine di testo (privacy, contributo regione) -> tipo "testo"
//   - planning orari (widget HTML) -> src/data/orario-corsi.json
//
// Uso:  node scripts/migrazione/normalizza-servizi.mjs <cartella-estratta> [cartella-output]
// (la cartella estratta e' l'output di estrai-pagine.mjs; si lancia dalla radice
// del progetto perche' i media vengono verificati dentro public/).
//
// Fedelta' ai contenuti: i testi restano quelli del sito originale, ripuliti dagli
// stili Elementor. Le risposte delle FAQ erano segnaposto ("Lorem ipsum"): non
// vengono portate (risposta = null).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { strip, percorso, pulisci, widgets, etichetta, heroDa } from './lib.mjs';

const [, , IN, OUT = 'src/data/pagine'] = process.argv;
if (!IN) {
	console.error('Uso: node normalizza-servizi.mjs <cartella-estratta> [cartella-output]');
	process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });

const leggi = (slug) => JSON.parse(fs.readFileSync(path.join(IN, slug + '.json'), 'utf8')).elementorData;
const scrivi = (slug, dati) => fs.writeFileSync(path.join(OUT, slug + '.json'), JSON.stringify(dati, null, '\t') + '\n');

const NOMI = {
	'sala-pesi': 'Sala Pesi',
	'personal-training': 'Personal Training',
	termario: 'Termarium',
	'nuoto-bimbi': 'Nuoto Bimbi',
	'body-camp': 'Body Summer Camp',
	ciclismo: 'Squadra Ciclistica',
	'centro-estetico': 'Centro Estetico',
	'body-lab': 'Body Lab',
	'corsi-fitness': 'Corsi Fitness',
	'privacy-body-energie': 'Privacy Policy',
	'contributo-regione-veneto': 'Contributo Regione Veneto',
};

// Pagine con i blocchi arancioni alternati (nel vecchio sito il contenuto stava in riquadri arancioni).
const STILE = { 'sala-pesi': 'arancio' };

// Titolo grande delle pagine con un'introduzione "titolo + testo". Il vecchio sito non
// lo aveva: e' un titolo scritto per questa migrazione, ricavato dal testo della pagina.
const TITOLO_INTRO = { 'sala-pesi': 'Allenati tra innovazione e natura.' };

const seoDa = (nome, testoHtml) => {
	const piano = strip(testoHtml);
	return {
		title: `${nome} - Body Energie | Villafranca di Verona`,
		description: piano.length > 155 ? piano.slice(0, 155).replace(/\s+\S*$/, '') + '…' : piano,
	};
};

// Pulsanti della hero: "#prova" e i Typeform diventano la richiesta di contatto
// della pagina (modale), il resto e' il link al planning.
function pulsantiHero(hero, slug) {
	return widgets(hero)
		.filter((w) => w.widgetType === 'button')
		.map((w) => {
			const testo = strip(w.settings.text);
			const link = w.settings.link?.url || '';
			return /typeform|#prova/i.test(link) ? { testo, interesse: slug } : { testo, href: '/orari' };
		});
}

function faqDa(el) {
	const cont = el.find((sec) => widgets(sec).some((w) => w.widgetType === 'nested-accordion'));
	const acc = cont && widgets(cont).find((w) => w.widgetType === 'nested-accordion');
	return {
		cont,
		faq: (acc?.settings.items || []).map((it, i) => {
			const testi = widgets(acc.elements?.[i] || { elements: [] })
				.filter((w) => w.widgetType === 'text-editor')
				.map((w) => pulisci(w.settings.editor))
				.join('');
			return { domanda: strip(it.item_title), risposta: testi && !/lorem ipsum/i.test(testi) ? testi : null };
		}),
	};
}

// Widget e sfondi delle sotto-colonne, nell'ordine in cui compaiono nella pagina.
function eventi(n, out = []) {
	for (const c of n.elements || []) {
		if (c.elType === 'widget') out.push({ w: c });
		else {
			const bg = c.settings?.background_image?.url;
			if (bg) out.push({ bg });
			eventi(c, out);
		}
	}
	return out;
}

function blocco(sez) {
	const ev = eventi(sez);
	const b = { id: null, titolo: null, sottotitolo: null, descrizioneHtml: '', video: null, immagini: [], adattamento: 'cover', dettagli: [], extra: null, portareTitolo: null, portare: [], intensita: [] };
	const sfondi = [];
	const slide = [];
	const foto = [];
	let titoloExtra = null;

	ev.forEach((e, k) => {
		if (e.bg) return sfondi.push(percorso(e.bg));
		const w = e.w;
		const s = w.settings || {};
		switch (w.widgetType) {
			case 'menu-anchor':
				b.id = s.anchor || null;
				break;
			case 'heading': {
				const t = strip(s.title);
				if (!t) break;
				if (s.header_size === 'h3' || /^cosa portare$/i.test(t)) b.portareTitolo = etichetta(t);
				else if (!b.titolo) b.titolo = t;
				else if (!b.descrizioneHtml) b.sottotitolo = t;
				break;
			}
			case 'icon-list': {
				const voci = (s.icon_list || []).map((it) => ({ testo: strip(it.text), icona: it.selected_icon?.value || null }));
				// Un elenco con una sola voce seguito da un testo, dopo la descrizione, e' il titolo di un riquadro.
				if (b.descrizioneHtml && ev[k + 1]?.w?.widgetType === 'text-editor') titoloExtra = voci[0]?.testo ?? null;
				else b.dettagli.push(...voci);
				break;
			}
			case 'text-editor':
				if (b.descrizioneHtml && titoloExtra) {
					b.extra = { titolo: titoloExtra, html: pulisci(s.editor) };
					titoloExtra = null;
				} else b.descrizioneHtml += pulisci(s.editor);
				break;
			case 'image-box':
				b.portare.push({ etichetta: strip(s.title_text), immagine: percorso(s.image?.url) });
				break;
			case 'video':
				b.video = percorso(s.hosted_url?.url || null);
				break;
			case 'slides':
				for (const sl of s.slides || []) if (sl.background_image?.url) slide.push(percorso(sl.background_image.url));
				break;
			case 'image':
				if (s.image?.url) foto.push(percorso(s.image.url));
				break;
			case 'gallery':
				for (const g of s.gallery || []) if (g.url) foto.push(percorso(g.url));
				break;
		}
	});

	const scelte = slide.length ? slide : foto.length ? foto : sfondi;
	b.immagini = [...new Set(scelte)];
	// I loghi (png) vanno mostrati interi, non ritagliati.
	if (b.immagini.length === 1 && /\.png$/i.test(b.immagini[0])) b.adattamento = 'contain';
	return b;
}

const valido = (b) => b.titolo || b.descrizioneHtml || b.immagini.length || b.video;

// ---- Pagine servizio ------------------------------------------------------
const SERVIZI = ['sala-pesi', 'personal-training', 'termario', 'nuoto-bimbi', 'body-camp', 'ciclismo', 'centro-estetico', 'body-lab'];
const indice = [];

// Pagine con un elenco di collegamenti alle proprie sezioni ("Scopri i nostri percorsi",
// le aree della sala pesi). Il vecchio sito aveva ancore sbagliate (due voci del Body Lab
// su #fisioterapista, il Loft Gym su #osteopata): qui ogni voce porta alla sua sezione.
const ELENCO_SEZIONI = {
	'body-lab': {
		'palestra della salute': 'salute',
		nutrizione: 'nutrizionista',
		osteopatia: 'osteopata',
		fisioterapia: 'fisioterapista',
		posturologia: 'posturologia',
	},
	'sala-pesi': {
		'gym floor (piano terra)': 'gymfloor1',
		'gym floor (primo piano)': 'gymfloor2',
		'loft gym': 'loftgym',
		'air park': 'airpark',
	},
};

for (const slug of SERVIZI) {
	const el = leggi(slug);
	const { cont: contFaq } = faqDa(el);
	const sezioni = el.slice(1).filter((sec) => sec !== contFaq);

	let blocchi = [];
	let percorsi = null;
	for (const sez of sezioni) {
		if (ELENCO_SEZIONI[slug] && widgets(sez).some((w) => w.widgetType === 'icon-list' && w.settings.icon_list?.length > 1)) {
			// Prima sezione: testo di apertura + elenco delle sezioni della pagina.
			blocchi.push(blocco(sez.elements[0]));
			const lista = widgets(sez).find((w) => w.widgetType === 'icon-list');
			const titolo = widgets(sez).filter((w) => w.widgetType === 'heading').map((w) => strip(w.settings.title)).find((t) => /percorsi/i.test(t));
			percorsi = {
				titolo,
				voci: lista.settings.icon_list.map((it) => {
					const testo = strip(it.text);
					const ancora = ELENCO_SEZIONI[slug][testo.toLowerCase()];
					if (!ancora) throw new Error('Voce senza sezione: ' + testo);
					return { testo, href: '#' + ancora };
				}),
			};
			continue;
		}
		const b = blocco(sez);
		if (valido(b)) blocchi.push(b);
	}

	if (slug === 'body-lab') {
		// Assegna a ogni sezione la sua ancora (l'originale ne ripeteva una).
		const ordine = ['salute', 'nutrizionista', 'osteopata', 'fisioterapista', 'posturologia'];
		blocchi.slice(1).forEach((b, i) => (b.id = ordine[i]));
	}

	// L'introduzione "titolo + testo" prende il posto del primo blocco, se questo e' solo testo.
	let intro = null;
	if (TITOLO_INTRO[slug]) {
		const [apertura, ...resto] = blocchi;
		if (apertura.titolo || apertura.immagini.length || apertura.video) throw new Error("Il primo blocco non e' solo testo: " + slug);
		intro = { titolo: TITOLO_INTRO[slug], html: apertura.descrizioneHtml };
		blocchi = resto;
	}

	const nome = NOMI[slug];
	const primoTesto = intro?.html ?? blocchi.find((b) => b.descrizioneHtml)?.descrizioneHtml ?? '';
	const pagina = {
		tipo: 'servizio',
		slug,
		nome,
		...(STILE[slug] ? { stile: STILE[slug] } : {}),
		seo: seoDa(nome, primoTesto),
		hero: { ...heroDa(el[0]), pulsanti: pulsantiHero(el[0], slug) },
		...(intro ? { intro } : {}),
		percorsi,
		blocchi,
	};
	scrivi(slug, pagina);
	indice.push({ slug, blocchi: blocchi.length, conFoto: blocchi.filter((b) => b.immagini.length).length, multi: blocchi.filter((b) => b.immagini.length > 1).length, pulsanti: pagina.hero.pulsanti.length });
}

// ---- Elenco corsi fitness -------------------------------------------------
{
	const slug = 'corsi-fitness';
	const el = leggi(slug);
	// Le card dell'originale puntavano a "#": qui vanno alla scheda del corso.
	const SCHEDA = {
		'BACK SCHOOL': 'back-school',
		BALANCE: 'balance-2',
		'PILATES MATWORK': 'pilates-matwork',
		YOGA: 'yoga',
		'TECHNOGYM RIDE®': 'technogym-ride',
		'GROUP CYCLING': 'group-cycling',
		'BODY PUMP®': 'body-pump-body-energie',
		'STRENGHT DEVELOPMENT®': 'strenght-development',
		'SHAPES®': 'balance',
		'ZUMBA®': 'zumba-body-energie',
		STEP: 'step-body-energie',
		'FUNCTIONAL TRAINING': 'functional-training-body-energie',
		POWERLIFTING: 'powerlifting-body-energie',
		'TRX®': 'trx-3',
	};
	const intro = el[1];
	const introWs = widgets(intro);
	const gruppi = el.slice(2).map((sez) => {
		const ws = widgets(sez);
		const titoli = ws.filter((w) => w.widgetType === 'heading');
		const corsi = titoli
			.filter((w) => w.settings.link?.url)
			.map((w) => {
				const nome = strip(w.settings.title);
				if (!SCHEDA[nome]) throw new Error('Corso senza scheda: ' + nome);
				if (!fs.existsSync(path.join(OUT, SCHEDA[nome] + '.json'))) throw new Error('Scheda mancante: ' + SCHEDA[nome]);
				return { nome, slug: SCHEDA[nome] };
			});
		return {
			titolo: strip(titoli[0].settings.title),
			html: pulisci(ws.find((w) => w.widgetType === 'text-editor').settings.editor),
			immagine: percorso(sez.settings.background_image?.url),
			corsi,
		};
	});
	const nome = NOMI[slug];
	const introHtml = pulisci(introWs.find((w) => w.widgetType === 'text-editor').settings.editor);
	scrivi(slug, {
		tipo: 'elenco',
		slug,
		nome,
		seo: seoDa(nome, introHtml),
		hero: { ...heroDa(el[0]), pulsanti: pulsantiHero(el[0], slug) },
		intro: { titolo: strip(introWs.find((w) => w.widgetType === 'heading').settings.title), html: introHtml },
		gruppi,
	});
	indice.push({ slug, blocchi: gruppi.length, conFoto: gruppi.length, multi: 0, pulsanti: 2 });
}

// ---- Pagine di testo ------------------------------------------------------
for (const slug of ['privacy-body-energie', 'contributo-regione-veneto']) {
	const el = leggi(slug);
	const ws = el.flatMap((sec) => widgets(sec));
	const titolo = strip(ws.find((w) => w.widgetType === 'heading').settings.title);
	const html = ws
		.filter((w) => w.widgetType === 'text-editor')
		.map((w) => pulisci(w.settings.editor, { abbassaTitoli: true }))
		.join('');
	const img = ws.find((w) => w.widgetType === 'image')?.settings.image?.url;
	const nome = NOMI[slug];
	scrivi(slug, { tipo: 'testo', slug, nome, seo: seoDa(nome, html.replace(/<h2>.*?<\/h2>/g, '')), titolo, html, immagine: percorso(img) || null });
	indice.push({ slug, blocchi: 1, conFoto: img ? 1 : 0, multi: 0, pulsanti: 0 });
}

// ---- Planning orari ---------------------------------------------------------
{
	const html = leggi('orari').flatMap((sec) => widgets(sec)).find((w) => w.widgetType === 'html').settings.html;
	const grezzo = html.match(/const S = (\{[\s\S]*?\n\});/)[1];
	const giorni = vm.runInNewContext('(' + grezzo + ')');
	const categorie = vm.runInNewContext('(' + html.match(/const CAT = (\{[\s\S]*?\});/)[1] + ')');
	const ore = (t) => t.split(':').map(Number).reduce((h, m) => h * 60 + m);
	const out = {
		stagione: strip(html.match(/<div class="season">([\s\S]*?)<\/div>/)[1]),
		validita: strip(html.match(/<div class="hero">[\s\S]*?<p>([\s\S]*?)<\/p>/)[1]),
		note: pulisci(html.match(/<div class="ft-note">\s*<p>([\s\S]*?)<\/p>/)[1]),
		categorie,
		giorni: Object.fromEntries(
			Object.entries(giorni).map(([g, voci]) => [
				g,
				voci
					.map((v) => ({ ora: v.t, nome: v.n, cat: v.c, ...(v.lm ? { lesMills: true } : {}), ...(v.nw ? { nuovo: true } : {}) }))
					.sort((a, b) => ore(a.ora) - ore(b.ora)),
			])
		),
	};
	fs.writeFileSync(path.join(path.dirname(OUT), 'orario-corsi.json'), JSON.stringify(out, null, '\t') + '\n');
	console.log('orari:', out.stagione, '|', out.validita, '|', Object.entries(out.giorni).map(([g, v]) => g + ':' + v.length).join(' '));
}

console.table(indice);
