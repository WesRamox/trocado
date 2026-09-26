// Navegação com recarga completa, para quando a sessão muda (login, logout, sessão expirada).
// router.push/replace reaproveitaria o cache do router, que guarda páginas buscadas com a
// sessão anterior: por exemplo, "/" buscada antes do login é um redirecionamento para /entrar.
export function reloadTo(path: string) {
  window.location.assign(path);
}
