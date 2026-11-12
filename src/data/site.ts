// Dati di contatto e link ufficiali di Body Energie: un'unica fonte per
// footer, pagine e (in futuro) dati strutturati. Sono gli stessi dati reali
// del sito originale (post ID 1068 di Elementor, footer).
export const site = {
	name: 'Body Energie',
	legalName: 'Body Energie ssd a.r.l.',
	vat: '03716930239',
	address: 'Via Adamello, 1, 37069 Villafranca di Verona (VR)',
	phone: '045 630 4337',
	phoneHref: 'tel:+390456304337',
	email: 'info@bodyenergie.it',
} as const;

export const mapsEmbedSrc = `https://www.google.com/maps?q=${encodeURIComponent(site.address)}&output=embed`;

// Icone SVG inline (viewBox 24x24): niente librerie esterne per tre simboli.
export const social = [
	{
		href: 'https://www.facebook.com/www.bodyenergie.it',
		label: 'Facebook',
		icon: '<path fill="currentColor" d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/>',
	},
	{
		href: 'https://www.instagram.com/body_energie/',
		label: 'Instagram',
		icon: '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.4" cy="6.6" r="1.3" fill="currentColor"/>',
	},
	{
		href: 'https://www.youtube.com/@bodyenergie1631',
		label: 'YouTube',
		icon: '<path fill="currentColor" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/>',
	},
];

export interface LegalLink {
	href: string;
	label: string;
	esterno?: boolean;
}

export const legalLinks: LegalLink[] = [
	{ href: '/privacy-body-energie', label: 'Privacy' },
	{ href: '/wp-content/uploads/2025/12/Regolamento-Body-Energie.pdf', label: 'Regolamento', esterno: true },
	{
		href: '/wp-content/uploads/2025/12/MODELLO-ORGANIZZATIVO-E-DI-CONTROLLO-DELLATTIVITA-SPORTIVA.pdf',
		label: 'Modello Organizzativo',
		esterno: true,
	},
	{ href: '/wp-content/uploads/2025/12/contributi.pdf', label: 'Contributi Pubblici', esterno: true },
];
