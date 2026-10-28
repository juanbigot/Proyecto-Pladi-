import { Polyline, Popup } from 'react-leaflet';

const PALETA_RAMALES = [
  '#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#42d4f4',
  '#f032e6', '#9a6324', '#008080', '#800000', '#808000', '#000075',
];


export function colorDeRamal(posicion) {
  if (posicion < PALETA_RAMALES.length) {
    return PALETA_RAMALES[posicion];
  }

  let extra = posicion - PALETA_RAMALES.length;
  let tono = Math.round((extra * 137.508) % 360);
  let luminosidad = 42;
  if (extra % 2 === 1) {
    luminosidad = 58;
  }
  return 'hsl(' + tono + ', 72%, ' + luminosidad + '%)';
}


const LIMITE_VUELTA_KM = 2.5;

function distanciaKm(a, b) {
  let dy = (a[0] - b[0]) * 111;
  let dx = (a[1] - b[1]) * 111 * Math.cos((a[0] * Math.PI) / 180);
  return Math.sqrt(dx * dx + dy * dy);
}

function tomarMuestra(puntos, cantidad) {
  if (puntos.length <= cantidad) {
    return puntos;
  }
  let muestra = [];
  for (let i = 0; i < cantidad; i++) {
    muestra.push(puntos[Math.round((i * (puntos.length - 1)) / (cantidad - 1))]);
  }
  return muestra;
}

function distanciaMediaEntreRecorridos(a, b) {
  let muestra = tomarMuestra(a, 25);
  let total = 0;
  for (let i = 0; i < muestra.length; i++) {
    let minima = Infinity;
    for (let j = 0; j < b.length; j++) {
      let d = distanciaKm(muestra[i], b[j]);
      if (d < minima) {
        minima = d;
      }
    }
    total = total + minima;
  }
  return total / muestra.length;
}


function distanciaEntreExtremos(a, b) {
  let ra = a.recorrido;
  let rb = b.recorrido;
  return distanciaKm(ra[0], rb[rb.length - 1]) + distanciaKm(ra[ra.length - 1], rb[0]);
}

function puntajeVuelta(a, b) {
  return (
    distanciaEntreExtremos(a, b) +
    distanciaMediaEntreRecorridos(a.recorrido, b.recorrido) +
    distanciaMediaEntreRecorridos(b.recorrido, a.recorrido)
  );
}

function etiquetaDeSentido(bandera) {
  let texto = (bandera.id + ' ' + bandera.descripcion).toUpperCase();
  let dice = { ida: /\bIDA/.test(texto), vuelta: /VTA|VUELTA/.test(texto) };

  if (dice.ida && !dice.vuelta) {
    return 'ida';
  }
  if (dice.vuelta && !dice.ida) {
    return 'vuelta';
  }
  return null;
}

function primeroEsLaIda(primero, segundo) {
  let a = etiquetaDeSentido(primero);
  let b = etiquetaDeSentido(segundo);

  if (a === 'ida' || b === 'vuelta') {
    return true;
  }
  if (b === 'ida' || a === 'vuelta') {
    return false;
  }
  return true;
}


function codigoDeRamal(bandera) {
  let encontrado = /\[([^\]]+)\]/.exec(bandera.nombre) || /\[([^\]]+)\]/.exec(bandera.descripcion);
  if (!encontrado) {
    return null;
  }
  return encontrado[1].toUpperCase().replace(/[^A-Z0-9]/g, '');
}


const PENALIZACION_RAMAL_DISTINTO = 1.0;
const PENALIZACION_RAMAL_DESCONOCIDO = 0.3;

function penalizacionPorRamal(a, b) {
  let codigoA = codigoDeRamal(a);
  let codigoB = codigoDeRamal(b);

  if (codigoA === null || codigoB === null) {
    return PENALIZACION_RAMAL_DESCONOCIDO;
  }
  if (codigoA === codigoB) {
    return 0;
  }
  return PENALIZACION_RAMAL_DISTINTO;
}

let sentidosGuardados = new Map();


export function separarPorSentido(datosParadas, abbr) {
  if (abbr === null) {
    return { ida: [], vuelta: [], parejas: new Map() };
  }

  let guardado = sentidosGuardados.get(abbr);
  if (guardado) {
    return guardado;
  }

  let linea = null;
  for (let i = 0; i < datosParadas.lineas.length; i++) {
    if (datosParadas.lineas[i].abbr === abbr) {
      linea = datosParadas.lineas[i];
    }
  }
  if (linea === null) {
    return { ida: [], vuelta: [], parejas: new Map() };
  }

  let ramales = [];
  for (let i = 0; i < datosParadas.banderas.length; i++) {
    let bandera = datosParadas.banderas[i];
    let tieneRecorrido = bandera.recorrido && bandera.recorrido.length > 0;
    if (linea.codigos.includes(bandera.linea) && tieneRecorrido) {
      ramales.push(bandera);
    }
  }

  let candidatas = [];
  for (let i = 0; i < ramales.length; i++) {
    for (let j = i + 1; j < ramales.length; j++) {
      if (ramales[i].linea !== ramales[j].linea) {
        continue;
      }

      let etiquetaI = etiquetaDeSentido(ramales[i]);
      if (etiquetaI !== null && etiquetaI === etiquetaDeSentido(ramales[j])) {
        continue;
      }

      if (distanciaEntreExtremos(ramales[i], ramales[j]) > LIMITE_VUELTA_KM) {
        continue;
      }
      let puntaje = puntajeVuelta(ramales[i], ramales[j]);
      if (puntaje <= LIMITE_VUELTA_KM) {
        candidatas.push({ i: i, j: j, puntaje: puntaje + penalizacionPorRamal(ramales[i], ramales[j]) });
      }
    }
  }
  candidatas.sort(function (a, b) {
    return a.puntaje - b.puntaje;
  });

  let sentidos = new Array(ramales.length).fill('ida');
  let usados = new Array(ramales.length).fill(false);
  let parejas = new Map();

  for (let k = 0; k < candidatas.length; k++) {
    let c = candidatas[k];
    if (usados[c.i] || usados[c.j]) {
      continue;
    }
    usados[c.i] = true;
    usados[c.j] = true;
    parejas.set(ramales[c.i].id, ramales[c.j]);
    parejas.set(ramales[c.j].id, ramales[c.i]);

    if (primeroEsLaIda(ramales[c.i], ramales[c.j])) {
      sentidos[c.j] = 'vuelta';
    } else {
      sentidos[c.i] = 'vuelta';
    }
  }

  let resultado = { ida: [], vuelta: [], parejas: parejas };

  for (let i = 0; i < ramales.length; i++) {
    if (sentidos[i] === 'ida' && parejas.has(ramales[i].id)) {
      resultado.ida.push(ramales[i]);
      resultado.vuelta.push(parejas.get(ramales[i].id));
    }
  }
  for (let i = 0; i < ramales.length; i++) {
    if (sentidos[i] === 'ida' && !parejas.has(ramales[i].id)) {
      resultado.ida.push(ramales[i]);
    }
  }

  sentidosGuardados.set(abbr, resultado);
  return resultado;
}

export function parejaDeSentido(datosParadas, bandera) {
  let linea = null;
  for (let i = 0; i < datosParadas.lineas.length; i++) {
    if (datosParadas.lineas[i].codigos.includes(bandera.linea)) {
      linea = datosParadas.lineas[i];
    }
  }
  if (linea === null) {
    return null;
  }

  let pareja = separarPorSentido(datosParadas, linea.abbr).parejas.get(bandera.id);
  if (pareja) {
    return pareja;
  }
  return null;
}


function CapaRecorridos({ ramales, ramalesOcultos }) {
  return (
    <>
      {ramales.map((bandera, posicion) => {
        if (ramalesOcultos[bandera.id] === true) {
          return null;
        }

        return (
          <Polyline
            key={bandera.id}
            positions={bandera.recorrido}
            pathOptions={{ color: colorDeRamal(posicion), weight: 4, opacity: 0.85 }}
          >
            <Popup>{bandera.nombre}</Popup>
          </Polyline>
        );
      })}
    </>
  );
}

export default CapaRecorridos;
