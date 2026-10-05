// Struttura del mega-menu ricostruita dal template header di Elementor (post ID 438)
// del sito WordPress originale: non esisteva un menu WP classico, la navigazione
// era tutta dentro il Theme Builder.
export interface VoceMenu {
	label: string;
	href: string;
}

export interface ColonnaMenu {
	titolo: string;
	/** Foto mostrata accanto all'elenco nella tendina del menu desktop. */
	immagine?: string;
	voci: VoceMenu[];
}

// Voce singola del menu, dopo le colonne: il planning dei corsi. Compare nell'header
// (desktop e mobile) e nella sezione "Vieni a trovarci".
export const voceOrari: VoceMenu = { label: 'Orari', href: '/orari' };

export const megaMenu: ColonnaMenu[] = [
	{
		titolo: 'Attività Adulti',
		immagine: '/wp-content/uploads/2025/11/Body-Energie-Azioni-54-scaled.jpg',
		voci: [
			{ label: 'Sala Pesi', href: '/sala-pesi' },
			{ label: 'Corsi Fitness', href: '/corsi-fitness' },
			{ label: 'Acqua Fitness', href: '/acqua' },
			{ label: 'Pilates Reformer', href: '/pilates-reformer' },
			{ label: 'Personal Training', href: '/personal-training' },
			{ label: 'Termarium', href: '/termario' },
		],
	},
	{
		titolo: 'Attività Bambini',
		immagine: '/wp-content/uploads/2025/10/nuoto-bambini-villafranca-di-verona-750x480-1.jpg',
		voci: [
			{ label: 'Nuoto Bimbi', href: '/nuoto-bimbi' },
			{ label: 'Body Summer Camp', href: '/body-camp' },
			{ label: 'Squadra Ciclistica', href: '/ciclismo' },
		],
	},
	{
		// Le 5 voci sono sezioni (ancore) della pagina /body-lab: nel sito originale
		// non avevano pagine proprie.
		titolo: 'Body Lab',
		immagine: '/wp-content/uploads/2025/07/stabile-body-energie.jpg',
		voci: [
			{ label: 'Palestra della salute', href: '/body-lab#salute' },
			{ label: 'Nutrizionista', href: '/body-lab#nutrizionista' },
			{ label: 'Fisioterapia', href: '/body-lab#fisioterapista' },
			{ label: 'Posturologia', href: '/body-lab#posturologia' },
			{ label: 'Osteopatia', href: '/body-lab#osteopata' },
		],
	},
];
