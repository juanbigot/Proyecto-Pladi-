const URL_BUSCAR = 'https://nominatim.openstreetmap.org/search';

const CAJA_LA_PLATA = '-58.2,-34.7,-57.7,-35.1';

const MAXIMO_OPCIONES = 4;
const DIFERENCIA_CLARA = 1.0;
const METROS_MISMO_LUGAR = 200;

const PALABRAS_VACIAS = ['la', 'plata', 'de', 'del', 'el', 'los', 'las', 'y', 'e', 'en', 'a', 'al', 'con'];

const ABREVIATURAS = { hosp: 'hospital', pza: 'plaza', plza: 'plaza', pque: 'parque' };

const INTENCIONES = [
  ['salud', /\b(hospital|clinica|sanatorio|policlinico|maternidad|cesac|salita|guardia)\b|centro de salud|unidad sanitaria/],
  ['plaza', /\b(plaza|plazoleta|parque|paseo|bosque)\b/],
];

export function normalizarTexto(texto) {
  let t = String(texto).toLowerCase();
  t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  t = t.replace(/[^a-z0-9 ]+/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();

  let palabras = t.split(' ');
  for (let i = 0; i < palabras.length; i++) {
    if (ABREVIATURAS[palabras[i]]) {
      palabras[i] = ABREVIATURAS[palabras[i]];
    }
  }
  return palabras.join(' ');
}

function detectarIntencion(textoNormal) {
  for (let i = 0; i < INTENCIONES.length; i++) {
    if (INTENCIONES[i][1].test(textoNormal)) {
      return INTENCIONES[i][0];
    }
  }
  return null;
}

export function crearConsulta(texto) {
  let normal = normalizarTexto(texto);
  let tokens = [];
  let palabras = normal.split(' ');
  for (let i = 0; i < palabras.length; i++) {
    if (palabras[i] !== '' && !PALABRAS_VACIAS.includes(palabras[i])) {
      tokens.push(palabras[i]);
    }
  }
  return { original: String(texto).trim(), normal: normal, tokens: tokens, intencion: detectarIntencion(normal) };
}

function expandirAbreviaturas(texto) {
  return texto.replace(/\b(hosp|pza|plza|pque)\b\.?/gi, (parte, abreviatura) => ABREVIATURAS[abreviatura.toLowerCase()]);
}

function urlDeBusqueda(q) {
  return (
    URL_BUSCAR +
    '?format=jsonv2&limit=10&addressdetails=1&dedupe=1&accept-language=es&countrycodes=ar' +
    '&viewbox=' + CAJA_LA_PLATA + '&bounded=1&q=' + encodeURIComponent(q)
  );
}

export function armarConsultas(consulta) {
  let texto = expandirAbreviaturas(consulta.original);
  let conCiudad = texto;
  if (!/la plata/.test(consulta.normal)) {
    conCiudad = texto + ', La Plata';
  }

  let urls = [urlDeBusqueda(conCiudad)];
  if (conCiudad !== texto) {
    urls.push(urlDeBusqueda(texto));
  }
  return urls;
}

function categoriaDe(r) {
  return r.category || r.class || '';
}

function nombreDe(r) {
  if (typeof r.name === 'string' && r.name.trim() !== '') {
    return r.name.trim();
  }
  return String(r.display_name || '').split(',')[0].trim();
}

function detalleDe(r) {
  let a = r.address || {};
  let partes = [];

  if (a.road) {
    partes.push(a.house_number ? a.road + ' ' + a.house_number : a.road);
  }
  let zona = a.suburb || a.neighbourhood || a.city_district || a.town || a.village || a.city;
  if (zona) {
    partes.push(zona);
  }

  if (partes.length === 0) {
    let trozos = String(r.display_name || '').split(',');
    partes = trozos.slice(1, 3).map((t) => t.trim()).filter((t) => t !== '');
  }
  return partes.join(', ');
}

function esDeSalud(r) {
  let categoria = categoriaDe(r);
  let tipo = r.type || '';
  if (categoria === 'amenity' && ['hospital', 'clinic', 'doctors', 'nursing_home'].includes(tipo)) {
    return true;
  }
  if (categoria === 'healthcare') {
    return true;
  }
  return categoria === 'building' && ['hospital', 'clinic'].includes(tipo);
}

function esDePlaza(r) {
  let categoria = categoriaDe(r);
  let tipo = r.type || '';
  if (categoria === 'leisure' && ['park', 'garden', 'playground', 'common'].includes(tipo)) {
    return true;
  }
  if (categoria === 'place' && tipo === 'square') {
    return true;
  }
  if (categoria === 'highway' && tipo === 'pedestrian') {
    return true;
  }
  return categoria === 'landuse' && ['recreation_ground', 'village_green'].includes(tipo);
}

function esDelTipo(r, intencion) {
  if (intencion === 'salud') {
    return esDeSalud(r);
  }
  if (intencion === 'plaza') {
    return esDePlaza(r);
  }
  return false;
}

function esCalle(r) {
  return categoriaDe(r) === 'highway' && r.type !== 'pedestrian';
}

function palabrasDe(texto) {
  return normalizarTexto(texto).split(' ').filter((p) => p !== '');
}

function aparece(palabras, token) {
  for (let i = 0; i < palabras.length; i++) {
    if (palabras[i] === token) {
      return true;
    }
    if (token.length >= 4 && palabras[i].startsWith(token)) {
      return true;
    }
  }
  return false;
}

function metrosEntre(a, b) {
  let dy = (a[0] - b[0]) * 111320;
  let dx = (a[1] - b[1]) * 111320 * Math.cos((a[0] * Math.PI) / 180);
  return Math.sqrt(dx * dx + dy * dy);
}

function crearLugar(r) {
  let lat = parseFloat(r.lat);
  let lon = parseFloat(r.lon);
  if (isNaN(lat) || isNaN(lon)) {
    return null;
  }
  return { id: String(r.place_id || r.osm_id || nombreDe(r) + lat), nombre: nombreDe(r), detalle: detalleDe(r), punto: [lat, lon] };
}

export function ordenarPorTipo(resultados, consulta) {
  let lugares = [];

  for (let i = 0; i < resultados.length; i++) {
    let r = resultados[i];
    let lugar = crearLugar(r);
    if (lugar === null) {
      continue;
    }

    let enNombre = 0;
    let enTodo = 0;
    let palabrasNombre = palabrasDe(lugar.nombre);
    let palabrasTodo = palabrasDe(r.display_name || '');
    for (let j = 0; j < consulta.tokens.length; j++) {
      if (aparece(palabrasNombre, consulta.tokens[j])) {
        enNombre = enNombre + 1;
      }
      if (aparece(palabrasTodo, consulta.tokens[j])) {
        enTodo = enTodo + 1;
      }
    }
    if (enNombre === 0) {
      continue;
    }

    let total = Math.max(consulta.tokens.length, 1);
    let puntaje = 3 * (enNombre / total) + enTodo / total;
    if (esDelTipo(r, consulta.intencion)) {
      puntaje = puntaje + 2;
    } else if (esCalle(r)) {
      puntaje = puntaje - 1.5;
    }
    puntaje = puntaje + 0.5 * Number(r.importance || 0);

    lugar.puntaje = puntaje;
    lugares.push(lugar);
  }

  lugares.sort((a, b) => b.puntaje - a.puntaje);

  let distintos = [];
  for (let i = 0; i < lugares.length; i++) {
    let repetido = false;
    for (let j = 0; j < distintos.length; j++) {
      let metros = metrosEntre(lugares[i].punto, distintos[j].punto);
      let mismoNombre = normalizarTexto(lugares[i].nombre) === normalizarTexto(distintos[j].nombre);
      if (metros < 60 || (mismoNombre && metros < METROS_MISMO_LUGAR)) {
        repetido = true;
        break;
      }
    }
    if (!repetido) {
      distintos.push(lugares[i]);
    }
  }
  return distintos;
}

export function elegirLugares(resultados, consulta) {
  if (consulta.intencion === null) {
    for (let i = 0; i < resultados.length; i++) {
      let lugar = crearLugar(resultados[i]);
      if (lugar !== null) {
        return { lugares: [lugar], claro: true };
      }
    }
    return { lugares: [], claro: false };
  }

  let ordenados = ordenarPorTipo(resultados, consulta);
  if (ordenados.length === 0) {
    return { lugares: [], claro: false };
  }
  if (ordenados.length === 1 || ordenados[0].puntaje - ordenados[1].puntaje >= DIFERENCIA_CLARA) {
    return { lugares: [ordenados[0]], claro: true };
  }

  let parecidos = [];
  for (let i = 0; i < ordenados.length && parecidos.length < MAXIMO_OPCIONES; i++) {
    if (ordenados[0].puntaje - ordenados[i].puntaje < DIFERENCIA_CLARA) {
      parecidos.push(ordenados[i]);
    }
  }
  return { lugares: parecidos, claro: false };
}

export async function buscarLugares(texto, pedirJson) {
  let consulta = crearConsulta(texto);
  let urls = armarConsultas(consulta);

  for (let i = 0; i < urls.length; i++) {
    let datos = await pedirJson(urls[i]);
    if (!Array.isArray(datos)) {
      continue;
    }
    let decision = elegirLugares(datos, consulta);
    if (decision.lugares.length > 0) {
      return decision;
    }
  }
  return { lugares: [], claro: false };
}
