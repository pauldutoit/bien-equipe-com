// Hôte unique : www.bien-equipe.com → bien-equipe.com (301), chemin et paramètres conservés.
// (Le jeton API du launcher ne peut pas créer de Redirect Rule de zone ; à remplacer par une
// règle Cloudflare si le trafic grossit, pour ne plus consommer d'invocations de Functions.)
export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.hostname === "www.bien-equipe.com") {
    url.hostname = "bien-equipe.com";
    return Response.redirect(url.toString(), 301);
  }
  return next();
}
