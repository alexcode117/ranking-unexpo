// Igual que normalizar_cedula() en SQL: 'v-27.123.481' → 'V27123481'.
export function normalizarCedula(texto: string): string | null {
  const digitos = texto.replace(/\D/g, "").replace(/^0+/, "");
  if (digitos.length < 5 || digitos.length > 10) return null;
  const letra = /^\s*[eE]/.test(texto) ? "E" : "V";
  return letra + digitos;
}

// 'V27123481' → 'V-27.123.481'
export function formatearCedula(c: string): string {
  return `${c[0]}-${c.slice(1).replace(/\B(?=(\d{3})+$)/g, ".")}`;
}
