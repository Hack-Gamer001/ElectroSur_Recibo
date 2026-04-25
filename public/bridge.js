// Este script se inyecta en el popup de ELSE via content script
// Intercepta la llamada a SesionELSE y manda el token al opener

(function() {
  const origFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await origFetch.apply(this, args);
    const url = args[0];
    
    if (typeof url === 'string' && url.includes('SesionELSE')) {
      try {
        const clone = response.clone();
        const json = await clone.json();
        if (json.exito && json.datos) {
          // Mandar token al opener (tu página principal)
          if (window.opener) {
            window.opener.postMessage({
              type: 'ELSE_TOKEN',
              token: json.datos
            }, '*');
          }
        }
      } catch(e) {}
    }
    return response;
  };
})();
