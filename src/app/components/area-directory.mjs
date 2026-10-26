export function filterAreas(rows, query) {
 const term=query.trim().toLocaleLowerCase();
 return rows.filter(row => !term || [row.city,row.neighborhood,row.state_code].filter(Boolean).join(' ').toLocaleLowerCase().includes(term));
}
