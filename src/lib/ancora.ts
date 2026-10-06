// Ancora di una sezione di una scheda (blocco del corso): serve per portare dritti alla sezione giusta,
// per esempio da /orari a "Acqua Bike" invece che in cima alla pagina Acqua (dove c'e' Acquagym).
// Se il blocco ha gia' un id (es. le sezioni di Body Lab) si usa quello, altrimenti nasce dal titolo.
export function idSezione(blocco: { id?: string | null; titolo?: string | null }): string | undefined {
	if (blocco.id) return blocco.id;
	if (!blocco.titolo) return undefined;
	return blocco.titolo
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}
