const LAT_CENTRO = -34.9214;   
const LNG_CENTRO = -57.9544;
const METROS_POR_GRADO_LAT = 110540;
const METROS_POR_GRADO_LNG = 111320 * Math.cos((LAT_CENTRO * Math.PI) / 180);

const ANGULO = -0.731676;
const EJE_B = [Math.cos(ANGULO), Math.sin(ANGULO)];     
const EJE_A = [-EJE_B[1], EJE_B[0]];                    

const SEPARACION_A = -139.727;
const ORIGEN_A = 1805.0;

const REFERENCIAS_B = [
  [32, -2522], [38, -1696], [44, -854], [48, -368], [49, -257], [51, -89],
  [54, 149], [55, 227], [56, 335], [57, 437], [60, 829], [64, 1387],
  [66, 1670], [68, 1946], [69, 2094], [70, 2212], [71, 2367], [72, 2506],
];

/*
  Diagonales del casco.
  En el sistema (p, q) de la ciudad (p: a lo largo del eje B, q: a lo largo del eje A) las diagonales forman
  45° con las calles, así que cada una es una recta:
    sentido  1:   q - p = c     (la 73 y la 79)
    sentido -1:   q + p = c     (la 74 y la 80)
  "c" y el tramo que cubre cada una (desde/hasta: metros a lo largo de la diagonal) se calcularon a partir de
  las paradas de colectivo que están sobre cada diagonal (el desvío típico es de unos 10 a 15 m).
  La 75, la 76, la 77 y la 78 no tienen paradas suficientes para ubicarlas, así que por ahora no se pueden buscar.
*/
const DIAGONALES = {
  73: { sentido: 1, c: -4.2, desde: -3528, hasta: 3485 },
  74: { sentido: -1, c: -25.5, desde: -3516, hasta: 3519 },
  79: { sentido: 1, c: 826.9, desde: 822, hasta: 2895 },
  80: { sentido: -1, c: 811.4, desde: 835, hasta: 2934 },
};

const NUMEROS_DIAGONAL = [73, 74, 75, 76, 77, 78, 79, 80];
const MARGEN_DIAGONAL = 300;   // metros que se toleran más allá de las paradas conocidas de cada diagonal

function esCalleA(n) {
  return n >= 1 && n <= 31;
}

function esCalleB(n) {
  return n >= 32 && n <= 72;
}

function posicionCalleB(numero) {
  let primera = REFERENCIAS_B[0];
  let ultima = REFERENCIAS_B[REFERENCIAS_B.length - 1];

  if (numero <= primera[0]) {
    return primera[1];
  }
  if (numero >= ultima[0]) {
    return ultima[1];
  }

  for (let i = 0; i < REFERENCIAS_B.length - 1; i++) {
    let desde = REFERENCIAS_B[i];
    let hasta = REFERENCIAS_B[i + 1];

    if (numero >= desde[0] && numero <= hasta[0]) {
      let fraccion = (numero - desde[0]) / (hasta[0] - desde[0]);
      return desde[1] + fraccion * (hasta[1] - desde[1]);
    }
  }
  return ultima[1];
}

// De las coordenadas (p, q) de la ciudad a [latitud, longitud]
function puntoDePQ(p, q) {
  let x = p * EJE_B[0] + q * EJE_A[0];
  let y = p * EJE_B[1] + q * EJE_A[1];

  return [LAT_CENTRO + y / METROS_POR_GRADO_LAT, LNG_CENTRO + x / METROS_POR_GRADO_LNG];
}

function posicionEsquina(calleA, calleB) {
  let p = posicionCalleB(calleB);
  let q = ORIGEN_A + SEPARACION_A * calleA;

  return puntoDePQ(p, q);
}


/* ---------- Cruces con diagonales ---------- */

// Cada calle (o diagonal) se representa como una recta en el sistema (p, q):
//   calle B: p constante   |   calle A: q constante   |   diagonal: q -/+ p = c
function curvaDeCalle(numero, esDiagonal) {
  if (esDiagonal) {
    let diagonal = DIAGONALES[numero];
    if (!diagonal) {
      return null;
    }
    return { tipo: 'diagonal', sentido: diagonal.sentido, c: diagonal.c, desde: diagonal.desde, hasta: diagonal.hasta };
  }
  if (esCalleA(numero)) {
    return { tipo: 'q', valor: ORIGEN_A + SEPARACION_A * numero };
  }
  if (esCalleB(numero)) {
    return { tipo: 'p', valor: posicionCalleB(numero) };
  }
  return null;
}

function etiquetaCalle(numero, esDiagonal) {
  if (esDiagonal) {
    return 'diagonal ' + numero;
  }
  return 'calle ' + numero;
}

// Punto donde se cruzan dos calles, en (p, q). Devuelve { p, q } o { error }
function cruzarCurvas(uno, otro) {
  let p;
  let q;

  if (uno.tipo === 'diagonal' && otro.tipo === 'diagonal') {
    if (uno.sentido === otro.sentido) {
      return { error: 'Esas diagonales son paralelas: no se cruzan.' };
    }
    let sube = uno.sentido === 1 ? uno : otro;
    let baja = uno.sentido === 1 ? otro : uno;
    q = (sube.c + baja.c) / 2;
    p = (baja.c - sube.c) / 2;
  } else if (uno.tipo === 'diagonal' || otro.tipo === 'diagonal') {
    let diagonal = uno.tipo === 'diagonal' ? uno : otro;
    let calle = uno.tipo === 'diagonal' ? otro : uno;

    if (calle.tipo === 'p') {
      p = calle.valor;
      q = diagonal.sentido === 1 ? p + diagonal.c : diagonal.c - p;
    } else {
      q = calle.valor;
      p = diagonal.sentido === 1 ? q - diagonal.c : diagonal.c - q;
    }
  } else {
    if (uno.tipo === otro.tipo) {
      return { error: 'Esas calles son paralelas: no se cruzan.' };
    }
    let conP = uno.tipo === 'p' ? uno : otro;
    let conQ = uno.tipo === 'q' ? uno : otro;
    p = conP.valor;
    q = conQ.valor;
  }

  // el cruce tiene que estar dentro del tramo que cubre cada diagonal
  let curvas = [uno, otro];
  for (let i = 0; i < curvas.length; i++) {
    let curva = curvas[i];
    if (curva.tipo !== 'diagonal') {
      continue;
    }
    let avance = curva.sentido === 1 ? (p + q) / Math.SQRT2 : (q - p) / Math.SQRT2;
    if (avance < curva.desde - MARGEN_DIAGONAL || avance > curva.hasta + MARGEN_DIAGONAL) {
      return { error: 'La diagonal no llega hasta ese cruce.' };
    }
  }

  return { p: p, q: q };
}


function ubicarAltura(calle, altura) {
  let cuadra = Math.floor(altura / 50);
  let avance = (altura - cuadra * 50) / 50;

  if (esCalleA(calle)) {
    let primera = cuadra + 32;
    if (primera >= 52) {
      primera = cuadra + 33;
    }
    if (primera < 32 || primera + 1 > 72) {
      return null;
    }
    return { primera: primera, avance: avance };
  }

  if (esCalleB(calle)) {
    let primera = cuadra - 5;
    if (primera < 1 || primera + 1 > 31) {
      return null;
    }
    return { primera: primera, avance: avance };
  }

  return null;
}

function puntoEnCalle(calle, transversal) {
  if (esCalleA(calle)) {
    return posicionEsquina(calle, transversal);
  }
  return posicionEsquina(transversal, calle);
}


function normalizar(texto) {
  let t = texto.toLowerCase();
  t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');   
  t = t.replace(/[º°]/g, '');                               
  t = t.replace(/\be\s*\//g, ' entre ');                   
  t = t.replace(/\//g, ' y ');
  t = t.replace(/&/g, ' y ');
  t = t.replace(/#/g, ' n ');
  t = t.replace(/[,;.()]/g, ' ');
  t = t.replace(/([a-z])(\d)/g, '$1 $2');                   
  t = t.replace(/(\d)([a-z])/g, '$1 $2');                  
  t = t.replace(/\b(?:diagonal|diag|dg)\s*(\d+)\b/g, ' d$1 ');                   // "diagonal 74" -> "d74"
  t = t.replace(/\b(calles|calle|avenida|avda|av|diagonal|diag|dg)\b/g, ' ');
  t = t.replace(/^\s*(esquina|esq)\b/, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

// "74" o "d74" (diagonal). Los números 73 a 80 solos también son diagonales: no hay calles con esos números en el casco
function leerCalle(token) {
  let diagonal = token.charAt(0) === 'd';
  let numero = Number(diagonal ? token.slice(1) : token);
  if (NUMEROS_DIAGONAL.includes(numero)) {
    diagonal = true;
  }
  return { numero: numero, diagonal: diagonal };
}

function interpretar(texto, datosParadas) {
  let t = normalizar(texto);
  let m;

  m = t.match(/^(d?\d+) entre (d?\d+) (?:y|e) (d?\d+)$/);
  if (m) {
    let calle = leerCalle(m[1]);
    let desde = leerCalle(m[2]);
    let hasta = leerCalle(m[3]);
    return {
      tipo: 'entre',
      calle: calle.numero, desde: desde.numero, hasta: hasta.numero,
      calleDiag: calle.diagonal, desdeDiag: desde.diagonal, hastaDiag: hasta.diagonal,
    };
  }

  m = t.match(/^(d?\d+) (?:y|e|esq|esquina|con|x) (d?\d+)$/);
  if (m) {
    let a = leerCalle(m[1]);
    let b = leerCalle(m[2]);
    return { tipo: 'esquina', a: a.numero, b: b.numero, aDiag: a.diagonal, bDiag: b.diagonal };
  }

  // "diagonal 74 50": dos números seguidos y uno de los dos es una diagonal escrita con la palabra
  m = t.match(/^(d?\d+) (d?\d+)$/);
  if (m && (m[1].charAt(0) === 'd' || m[2].charAt(0) === 'd')) {
    let a = leerCalle(m[1]);
    let b = leerCalle(m[2]);
    return { tipo: 'esquina', a: a.numero, b: b.numero, aDiag: a.diagonal, bDiag: b.diagonal };
  }

  m = t.match(/^(\d+) (?:n|nro|num|numero|al|altura|casa) (\d+)$/);
  if (m) {
    return { tipo: 'altura', calle: Number(m[1]), altura: Number(m[2]) };
  }

  m = t.match(/^(\d+) (\d+)$/);
  if (m) {
    let primero = Number(m[1]);
    let segundo = Number(m[2]);

    if (segundo < 100) {
      return {
        tipo: 'esquina', a: primero, b: segundo,
        aDiag: NUMEROS_DIAGONAL.includes(primero), bDiag: NUMEROS_DIAGONAL.includes(segundo),
      };
    }
    if (buscarParadaEnEsquina(primero, segundo, datosParadas) !== null) {
      return { tipo: 'esquina', a: primero, b: segundo };
    }
    return { tipo: 'altura', calle: primero, altura: segundo };
  }

  return null;
}

function numeroDeCalle(nombre) {
  let m = nombre.trim().match(/^(?:calle|avenida|av)\s*(\d+)$/i);
  if (m) {
    return Number(m[1]);
  }
  return null;
}

function buscarParadaEnEsquina(a, b, datosParadas) {
  let mejor = null;
  let mejorDistancia = Infinity;

  for (let i = 0; i < datosParadas.paradas.length; i++) {
    let parada = datosParadas.paradas[i];
    let n1 = numeroDeCalle(parada.calle[0]);
    let n2 = numeroDeCalle(parada.calle[1]);

    let coincide = (n1 === a && n2 === b) || (n1 === b && n2 === a);
    if (!coincide) {
      continue;
    }

    let dy = (parada.coords[0] - LAT_CENTRO) * METROS_POR_GRADO_LAT;
    let dx = (parada.coords[1] - LNG_CENTRO) * METROS_POR_GRADO_LNG;
    let distancia = Math.sqrt(dx * dx + dy * dy);

    if (distancia < mejorDistancia) {
      mejorDistancia = distancia;
      mejor = parada.coords;
    }
  }

  return mejor;
}


export function ubicarDireccion(texto, datosParadas) {
  let pedido = interpretar(texto, datosParadas);
  if (pedido === null) {
    return null;
  }

  // Pedidos donde interviene una diagonal: se resuelven con las rectas de cada calle
  if (pedido.tipo === 'esquina' && (pedido.aDiag || pedido.bDiag)) {
    let uno = curvaDeCalle(pedido.a, pedido.aDiag);
    let otro = curvaDeCalle(pedido.b, pedido.bDiag);
    if (uno === null || otro === null) {
      return null;
    }

    let cruce = cruzarCurvas(uno, otro);
    if (cruce.error) {
      return { error: cruce.error };
    }
    return {
      punto: puntoDePQ(cruce.p, cruce.q),
      descripcion: 'esquina de ' + etiquetaCalle(pedido.a, pedido.aDiag) + ' y ' + etiquetaCalle(pedido.b, pedido.bDiag),
    };
  }

  if (pedido.tipo === 'entre' && (pedido.calleDiag || pedido.desdeDiag || pedido.hastaDiag)) {
    let base = curvaDeCalle(pedido.calle, pedido.calleDiag);
    let primera = curvaDeCalle(pedido.desde, pedido.desdeDiag);
    let segunda = curvaDeCalle(pedido.hasta, pedido.hastaDiag);
    if (base === null || primera === null || segunda === null) {
      return null;
    }

    let inicio = cruzarCurvas(base, primera);
    if (inicio.error) {
      return { error: inicio.error };
    }
    let fin = cruzarCurvas(base, segunda);
    if (fin.error) {
      return { error: fin.error };
    }

    return {
      punto: puntoDePQ((inicio.p + fin.p) / 2, (inicio.q + fin.q) / 2),
      descripcion:
        etiquetaCalle(pedido.calle, pedido.calleDiag) + ' entre ' +
        etiquetaCalle(pedido.desde, pedido.desdeDiag) + ' y ' + etiquetaCalle(pedido.hasta, pedido.hastaDiag),
    };
  }

  if (pedido.tipo === 'esquina') {
    let a = pedido.a;
    let b = pedido.b;

    if (esCalleA(a) && esCalleB(b)) {
      return { punto: posicionEsquina(a, b), descripcion: 'esquina de calles ' + a + ' y ' + b };
    }
    if (esCalleB(a) && esCalleA(b)) {
      return { punto: posicionEsquina(b, a), descripcion: 'esquina de calles ' + a + ' y ' + b };
    }
    if ((esCalleA(a) && esCalleA(b)) || (esCalleB(a) && esCalleB(b))) {
      return { error: 'Las calles ' + a + ' y ' + b + ' son paralelas: no se cruzan.' };
    }

    let parada = buscarParadaEnEsquina(a, b, datosParadas);
    if (parada !== null) {
      return { punto: parada, descripcion: 'esquina de calles ' + a + ' y ' + b + ' (según las paradas)' };
    }
    return null;
  }

  if (pedido.tipo === 'entre') {
    let calle = pedido.calle;
    let desde = pedido.desde;
    let hasta = pedido.hasta;

    let transversalesOk = false;
    if (esCalleA(calle) && esCalleB(desde) && esCalleB(hasta)) {
      transversalesOk = true;
    }
    if (esCalleB(calle) && esCalleA(desde) && esCalleA(hasta)) {
      transversalesOk = true;
    }
    if (!transversalesOk) {
      if (esCalleA(calle) || esCalleB(calle)) {
        return { error: 'Las calles ' + desde + ' y ' + hasta + ' no cruzan la calle ' + calle + '.' };
      }
      return null;
    }

    let inicio = puntoEnCalle(calle, desde);
    let fin = puntoEnCalle(calle, hasta);
    let medio = [(inicio[0] + fin[0]) / 2, (inicio[1] + fin[1]) / 2];

    return { punto: medio, descripcion: 'calle ' + calle + ' entre ' + desde + ' y ' + hasta };
  }

  if (pedido.tipo === 'altura') {
    let calle = pedido.calle;

    if (!esCalleA(calle) && !esCalleB(calle)) {
      return null;
    }

    let cuadra = ubicarAltura(calle, pedido.altura);
    if (cuadra === null) {
      return {
        error:
          'La altura ' + pedido.altura + ' de la calle ' + calle + ' queda fuera del casco urbano. ' +
          'Si querías una esquina, escribí por ejemplo "' + calle + ' y ' + pedido.altura + '".',
      };
    }

    let punto = puntoEnCalle(calle, cuadra.primera + cuadra.avance);

    return {
      punto: punto,
      descripcion:
        'calle ' + calle + ' al ' + pedido.altura +
        ' (entre ' + cuadra.primera + ' y ' + (cuadra.primera + 1) + ')',
    };
  }

  return null;
}

const AVENIDAS = [1, 7, 13, 19, 25, 31, 32, 38, 44, 51, 53, 60, 66, 72];

function nombreDeCalle(numero) {
  if (AVENIDAS.includes(numero)) {
    return 'Avenida ' + numero;
  }
  return 'Calle ' + numero;
}

function numeroCalleB(metros) {
  let primera = REFERENCIAS_B[0];
  let ultima = REFERENCIAS_B[REFERENCIAS_B.length - 1];

  if (metros < primera[1] - 70 || metros > ultima[1] + 70) {
    return null;
  }
  if (metros <= primera[1]) {
    return primera[0];
  }
  if (metros >= ultima[1]) {
    return ultima[0];
  }

  for (let i = 0; i < REFERENCIAS_B.length - 1; i++) {
    let desde = REFERENCIAS_B[i];
    let hasta = REFERENCIAS_B[i + 1];

    if (metros >= desde[1] && metros <= hasta[1]) {
      let fraccion = (metros - desde[1]) / (hasta[1] - desde[1]);
      return desde[0] + fraccion * (hasta[0] - desde[0]);
    }
  }
  return ultima[0];
}

function redondearAltura(altura) {
  return Math.round(altura / 10) * 10;
}

export function direccionDePunto(punto) {
  let dx = (punto[1] - LNG_CENTRO) * METROS_POR_GRADO_LNG;
  let dy = (punto[0] - LAT_CENTRO) * METROS_POR_GRADO_LAT;

  let p = dx * EJE_B[0] + dy * EJE_B[1];
  let q = dx * EJE_A[0] + dy * EJE_A[1];

  let a = (q - ORIGEN_A) / SEPARACION_A;  
  let b = numeroCalleB(p);                 

  if (b === null || a < 0.5 || a > 31.5) {
    return null;
  }
  if (a < 1) {
    a = 1;
  }
  if (a > 31) {
    a = 31;
  }

  let calleA = Math.round(a);
  let calleB = Math.round(b);

  let metrosA = Math.abs(a - calleA) * Math.abs(SEPARACION_A);
  let metrosB = Math.abs(posicionCalleB(b) - posicionCalleB(calleB));

  if (metrosA <= 35 && metrosB <= 35) {
    return nombreDeCalle(calleA) + ' y ' + nombreDeCalle(calleB);
  }

  if (metrosA <= metrosB) {
    if (b >= 52 && b < 53) {
      return nombreDeCalle(calleA) + ' entre 52 y 53';   // en esa cuadra no hay numeración
    }

    let primera = Math.floor(b);
    let avance = b - primera;
    if (primera >= 72) {
      primera = 71;
      avance = 1;
    }

    let cuadra = primera - 32;
    if (primera >= 53) {
      cuadra = primera - 33;
    }

    let altura = redondearAltura(cuadra * 50 + avance * 50);
    if (altura > 1999) {
      altura = 1999;
    }
    return nombreDeCalle(calleA) + ' N° ' + altura;
  }

  let primera = Math.floor(a);
  let avance = a - primera;
  if (primera >= 31) {
    primera = 30;
    avance = 1;
  }

  let altura = redondearAltura((primera + 5) * 50 + avance * 50);
  return nombreDeCalle(calleB) + ' N° ' + altura;
}
