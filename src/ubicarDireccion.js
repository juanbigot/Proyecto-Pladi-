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

function posicionEsquina(calleA, calleB) {
  let p = posicionCalleB(calleB);
  let q = ORIGEN_A + SEPARACION_A * calleA;

  let x = p * EJE_B[0] + q * EJE_A[0];
  let y = p * EJE_B[1] + q * EJE_A[1];

  return [LAT_CENTRO + y / METROS_POR_GRADO_LAT, LNG_CENTRO + x / METROS_POR_GRADO_LNG];
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
  t = t.replace(/\b(calles|calle|avenida|avda|av|diagonal|diag|dg)\b/g, ' ');
  t = t.replace(/^\s*(esquina|esq)\b/, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

function interpretar(texto, datosParadas) {
  let t = normalizar(texto);
  let m;

  m = t.match(/^(\d+) entre (\d+) (?:y|e) (\d+)$/);
  if (m) {
    return { tipo: 'entre', calle: Number(m[1]), desde: Number(m[2]), hasta: Number(m[3]) };
  }

  m = t.match(/^(\d+) (?:y|e|esq|esquina|con|x) (\d+)$/);
  if (m) {
    return { tipo: 'esquina', a: Number(m[1]), b: Number(m[2]) };
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
      return { tipo: 'esquina', a: primero, b: segundo };
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
      return nombreDeCalle(calleA) + ' entre 52 y 53'; 
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
