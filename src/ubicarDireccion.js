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

const BANDAS_P = [
  [
    [72, 2506], [73, 2681], [74, 2785], [75, 2892], [76, 2986], [77, 3116], [78, 3241],
    [80, 3521], [82, 3793], [83, 3967], [85, 4195], [87, 4406], [88, 4479], [90, 4653],
    [92, 4908], [94, 5113], [96, 5310], [98, 5513],
  ],
  [
    [495, -7441], [497, -7245], [499, -7010], [502, -6709], [503, -6570], [504, -6375], [505, -6291],
    [506, -6124], [507, -6013], [508, -5872], [510, -5590], [511, -5447], [512, -5312], [513, -5177],
    [514, -5025], [516, -4754], [517, -4603], [518, -4493], [520, -4203], [521, -4074], [522, -3933],
    [523, -3789], [524, -3662], [525, -3518], [526, -3365], [527, -3200], [528, -3093], [529, -2951],
    [530, -2801], [532, -2600],
  ],
  [
    [600, 5725], [601, 5851], [604, 6235], [606, 6357], [607, 6476], [608, 6614], [609, 6712],
    [610, 6858], [613, 7164], [614, 7291], [620, 7882], [622, 8124], [628, 8750], [630, 9028],
    [632, 9175], [633, 9364], [635, 9596], [637, 9801], [641, 10059], [643, 10284], [648, 10878],
    [649, 11008], [650, 11146], [652, 11322], [655, 11628], [656, 11812], [659, 12008],
  ],
];

const BANDAS_Q = [
  [
    [115, 1802], [116, 1950], [117, 2094], [118, 2277], [119, 2373], [120, 2497], [121, 2702],
    [122, 2834], [123, 2976], [124, 3080], [126, 3272], [128, 3504],
  ],
  [
    [131, -2599], [132, -2664], [133, -2866], [135, -3140], [136, -3283], [137, -3421], [139, -3711],
    [140, -3840], [141, -3979], [143, -4259], [144, -4394], [145, -4552], [146, -4678], [147, -4817],
    [149, -5103], [151, -5379], [153, -5658], [155, -5935], [157, -6217], [159, -6489], [161, -6777],
    [163, -7054], [165, -7330], [167, -7603], [169, -7937], [170, -8055], [171, -8197], [173, -8449],
    [175, -8662], [177, -9005], [179, -9287], [181, -9511], [182, -9688], [183, -9868], [184, -9957],
    [185, -10127], [187, -10465], [189, -10693], [190, -10811], [191, -11010], [194, -11369], [195, -11501],
    [197, -11814], [200, -12243], [203, -12613], [205, -12941], [208, -13376], [210, -13718], [212, -13832],
    [214, -14073], [217, -14437], [220, -14793], [223, -15129], [226, -15480], [229, -15892],
  ],
];

const NUMEROS_INESTABLES = [84, 86, 89, 134, 501, 515, 519, 621, 646];
const SALTO_MAXIMO = 3;


const DIAGONALES = {
  73: { sentido: 1, c: -4.2, desde: -3528, hasta: 3485 },
  74: { sentido: -1, c: -25.5, desde: -3516, hasta: 3519 },
  79: { sentido: 1, c: 826.9, desde: 822, hasta: 2895 },
  80: { sentido: -1, c: 811.4, desde: 835, hasta: 2934 },
};

const NUMEROS_DIAGONAL = [73, 74, 75, 76, 77, 78, 79, 80];
const MARGEN_DIAGONAL = 300;  

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

function posicionEnBandas(bandas, numero) {
  if (NUMEROS_INESTABLES.includes(numero)) {
    return null;
  }

  for (let i = 0; i < bandas.length; i++) {
    let banda = bandas[i];

    for (let j = 0; j < banda.length; j++) {
      if (banda[j][0] === numero) {
        return banda[j][1];
      }
      if (banda[j][0] > numero) {
        if (j === 0) {
          break;
        }
        let anterior = banda[j - 1];
        let siguiente = banda[j];
        if (siguiente[0] - anterior[0] > SALTO_MAXIMO) {
          return null;
        }
        let fraccion = (numero - anterior[0]) / (siguiente[0] - anterior[0]);
        return anterior[1] + fraccion * (siguiente[1] - anterior[1]);
      }
    }
  }
  return null;
}

function posicionP(numero) {
  if (esCalleB(numero)) {
    return posicionCalleB(numero);
  }
  return posicionEnBandas(BANDAS_P, numero);
}

function posicionQ(numero) {
  if (esCalleA(numero)) {
    return ORIGEN_A + SEPARACION_A * numero;
  }
  return posicionEnBandas(BANDAS_Q, numero);
}


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


function curvaDeCalle(numero, esDiagonal) {
  if (esDiagonal) {
    let diagonal = DIAGONALES[numero];
    if (!diagonal) {
      return null;
    }
    return { tipo: 'diagonal', sentido: diagonal.sentido, c: diagonal.c, desde: diagonal.desde, hasta: diagonal.hasta };
  }
  let q = posicionQ(numero);
  if (q !== null) {
    return { tipo: 'q', valor: q };
  }
  let p = posicionP(numero);
  if (p !== null) {
    return { tipo: 'p', valor: p };
  }
  return null;
}

function etiquetaCalle(numero, esDiagonal) {
  if (esDiagonal) {
    return 'diagonal ' + numero;
  }
  return 'calle ' + numero;
}


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
  t = t.replace(/\b(?:diagonal|diag|dg)\s*(\d+)\b/g, ' d$1 ');                   
  t = t.replace(/\b(?:calles|calle|avenida|avda|av)\s*(7[3-9]|80)\b/g, ' c$1 ');
  t = t.replace(/\b(calles|calle|avenida|avda|av|diagonal|diag|dg)\b/g, ' ');
  t = t.replace(/^\s*(esquina|esq)\b/, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

function leerCalle(token) {
  let marca = token.charAt(0);
  let explicita = marca === 'd' || marca === 'c';
  let numero = Number(explicita ? token.slice(1) : token);
  return {
    numero: numero,
    diagonal: marca === 'd',
    ambigua: !explicita && NUMEROS_DIAGONAL.includes(numero),
  };
}

function crearEsquina(a, b) {
  return {
    tipo: 'esquina', a: a.numero, b: b.numero,
    aDiag: a.diagonal, bDiag: b.diagonal, aAmb: a.ambigua, bAmb: b.ambigua,
  };
}

function interpretar(texto, datosParadas) {
  let t = normalizar(texto);
  let m;

  m = t.match(/^([dc]?\d+) entre ([dc]?\d+) (?:y|e) ([dc]?\d+)$/);
  if (m) {
    let calle = leerCalle(m[1]);
    let desde = leerCalle(m[2]);
    let hasta = leerCalle(m[3]);
    return {
      tipo: 'entre',
      calle: calle.numero, desde: desde.numero, hasta: hasta.numero,
      calleDiag: calle.diagonal, desdeDiag: desde.diagonal, hastaDiag: hasta.diagonal,
      calleAmb: calle.ambigua, desdeAmb: desde.ambigua, hastaAmb: hasta.ambigua,
    };
  }

  m = t.match(/^([dc]?\d+) (?:y|e|esq|esquina|con|x) ([dc]?\d+)$/);
  if (m) {
    return crearEsquina(leerCalle(m[1]), leerCalle(m[2]));
  }

  m = t.match(/^([dc]?\d+) ([dc]?\d+)$/);
  if (m && (/^[dc]/.test(m[1]) || /^[dc]/.test(m[2]))) {
    return crearEsquina(leerCalle(m[1]), leerCalle(m[2]));
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
      return crearEsquina(leerCalle(m[1]), leerCalle(m[2]));
    }
    if (buscarParadaEnEsquina(primero, segundo, datosParadas) !== null) {
      return crearEsquina(leerCalle(m[1]), leerCalle(m[2]));
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


function camposDelPedido(pedido) {
  if (pedido.tipo === 'esquina') {
    return ['a', 'b'];
  }
  if (pedido.tipo === 'entre') {
    return ['calle', 'desde', 'hasta'];
  }
  return [];
}

function prefiereDiagonal(pedido, campos, campo) {
  for (let i = 0; i < campos.length; i++) {
    let otro = campos[i];
    if (otro === campo) {
      continue;
    }
    if (pedido[otro + 'Diag'] || pedido[otro + 'Amb'] || pedido[otro] <= 72) {
      return true;
    }
  }
  return false;
}

function bitsEncendidos(numero) {
  let cantidad = 0;
  while (numero > 0) {
    cantidad = cantidad + (numero & 1);
    numero = numero >> 1;
  }
  return cantidad;
}

function crearVariantes(pedido) {
  let campos = camposDelPedido(pedido);
  let ambiguos = [];
  for (let i = 0; i < campos.length; i++) {
    if (pedido[campos[i] + 'Amb']) {
      ambiguos.push(campos[i]);
    }
  }
  if (ambiguos.length === 0) {
    return [pedido];
  }

  let base = { ...pedido };
  for (let i = 0; i < ambiguos.length; i++) {
    base[ambiguos[i] + 'Diag'] = prefiereDiagonal(pedido, campos, ambiguos[i]);
  }

  let mascaras = [];
  for (let m = 1; m < Math.pow(2, ambiguos.length); m++) {
    mascaras.push(m);
  }
  mascaras.sort((x, y) => bitsEncendidos(x) - bitsEncendidos(y));

  let variantes = [base];
  for (let i = 0; i < mascaras.length; i++) {
    let copia = { ...base };
    for (let j = 0; j < ambiguos.length; j++) {
      if ((mascaras[i] >> j) & 1) {
        copia[ambiguos[j] + 'Diag'] = !base[ambiguos[j] + 'Diag'];
      }
    }
    variantes.push(copia);
  }
  return variantes;
}

export function ubicarDireccion(texto, datosParadas) {
  let pedido = interpretar(texto, datosParadas);
  if (pedido === null) {
    return null;
  }

  let variantes = crearVariantes(pedido);
  let primero = resolverPedido(variantes[0], datosParadas);
  if (primero !== null && !primero.error) {
    return primero;
  }

  for (let i = 1; i < variantes.length; i++) {
    let otro = resolverPedido(variantes[i], datosParadas);
    if (otro !== null && !otro.error) {
      return otro;
    }
  }
  return primero;
}

function resolverPedido(pedido, datosParadas) {

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

    let curvaA = curvaDeCalle(a, false);
    let curvaB = curvaDeCalle(b, false);

    if (curvaA !== null && curvaB !== null) {
      let cruce = cruzarCurvas(curvaA, curvaB);
      if (!cruce.error) {
        return { punto: puntoDePQ(cruce.p, cruce.q), descripcion: 'esquina de calles ' + a + ' y ' + b };
      }
      if ((esCalleA(a) || esCalleB(a)) && (esCalleA(b) || esCalleB(b))) {
        return { error: 'Las calles ' + a + ' y ' + b + ' son paralelas: no se cruzan.' };
      }
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

    let base = curvaDeCalle(calle, false);
    let primera = curvaDeCalle(desde, false);
    let segunda = curvaDeCalle(hasta, false);

    let transversalesOk = false;
    if (base !== null && primera !== null && segunda !== null) {
      if (primera.tipo !== base.tipo && segunda.tipo !== base.tipo) {
        transversalesOk = true;
      }
    }
    if (!transversalesOk) {
      if (esCalleA(calle) || esCalleB(calle)) {
        return { error: 'Las calles ' + desde + ' y ' + hasta + ' no cruzan la calle ' + calle + '.' };
      }
      return null;
    }

    let inicio = cruzarCurvas(base, primera);
    let fin = cruzarCurvas(base, segunda);
    let medio = puntoDePQ((inicio.p + fin.p) / 2, (inicio.q + fin.q) / 2);

    return { punto: medio, descripcion: 'calle ' + calle + ' entre ' + desde + ' y ' + hasta };
  }

  if (pedido.tipo === 'altura') {
    let calle = pedido.calle;

    if (!esCalleA(calle) && !esCalleB(calle)) {
      return null;
    }

    let cuadra = ubicarAltura(calle, pedido.altura);
    if (cuadra === null) {
      return null;
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

const AVENIDAS = [1, 7, 13, 19, 25, 31, 32, 38, 44, 51, 53, 60, 66, 72, 122, 137, 520, 532];

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

let respaldoGuardado = null;

function puntosDeRespaldo(datosParadas) {
  let resultado = [];

  for (let i = 0; i < datosParadas.paradas.length; i++) {
    let parada = datosParadas.paradas[i];
    let n1 = numeroDeCalle(parada.calle[0]);
    let n2 = numeroDeCalle(parada.calle[1]);
    if (n1 === null || n2 === null) {
      continue;
    }

    let dx = (parada.coords[1] - LNG_CENTRO) * METROS_POR_GRADO_LNG;
    let dy = (parada.coords[0] - LAT_CENTRO) * METROS_POR_GRADO_LAT;
    let p = dx * EJE_B[0] + dy * EJE_B[1];
    let q = dx * EJE_A[0] + dy * EJE_A[1];

    let pares = [[n1, n2], [n2, n1]];
    for (let j = 0; j < pares.length; j++) {
      let qEsperado = posicionQ(pares[j][0]);
      let pEsperado = posicionP(pares[j][1]);
      if (qEsperado === null || pEsperado === null) {
        continue;
      }
      if (Math.sqrt((p - pEsperado) * (p - pEsperado) + (q - qEsperado) * (q - qEsperado)) <= 90) {
        resultado.push([p, q]);
        break;
      }
    }
  }
  return resultado;
}

function hayParadasCerca(p, q, datosParadas) {
  if (!datosParadas) {
    return false;
  }
  if (respaldoGuardado === null || respaldoGuardado.datos !== datosParadas) {
    respaldoGuardado = { datos: datosParadas, puntos: puntosDeRespaldo(datosParadas) };
  }

  let puntos = respaldoGuardado.puntos;
  for (let i = 0; i < puntos.length; i++) {
    let dp = p - puntos[i][0];
    let dq = q - puntos[i][1];
    if (dp * dp + dq * dq <= 500 * 500) {
      return true;
    }
  }
  return false;
}

function lineaMasCercana(lineas, metros) {
  let numero = null;
  let distancia = Infinity;

  for (let i = 0; i < lineas.length; i++) {
    let d = Math.abs(lineas[i][1] - metros);
    if (d < distancia) {
      distancia = d;
      numero = lineas[i][0];
    }
  }
  return { numero: numero, distancia: distancia };
}

function agregarLineas(destino, bandas) {
  for (let i = 0; i < bandas.length; i++) {
    for (let j = 0; j < bandas[i].length; j++) {
      if (!NUMEROS_INESTABLES.includes(bandas[i][j][0])) {
        destino.push(bandas[i][j]);
      }
    }
  }
}

function nombreFueraDelCasco(p, q, datosParadas) {
  let lineasQ = [];
  for (let n = 1; n <= 31; n++) {
    lineasQ.push([n, ORIGEN_A + SEPARACION_A * n]);
  }
  agregarLineas(lineasQ, BANDAS_Q);

  let lineasP = [];
  for (let n = 32; n <= 72; n++) {
    lineasP.push([n, posicionCalleB(n)]);
  }
  agregarLineas(lineasP, BANDAS_P);

  let cercanaQ = lineaMasCercana(lineasQ, q);
  let cercanaP = lineaMasCercana(lineasP, p);

  if (cercanaQ.distancia > 35 || cercanaP.distancia > 35) {
    return null;
  }
  if (!hayParadasCerca(p, q, datosParadas)) {
    return null;
  }
  return nombreDeCalle(cercanaQ.numero) + ' y ' + nombreDeCalle(cercanaP.numero);
}

export function direccionDePunto(punto, datosParadas) {
  let dx = (punto[1] - LNG_CENTRO) * METROS_POR_GRADO_LNG;
  let dy = (punto[0] - LAT_CENTRO) * METROS_POR_GRADO_LAT;

  let p = dx * EJE_B[0] + dy * EJE_B[1];
  let q = dx * EJE_A[0] + dy * EJE_A[1];

  let a = (q - ORIGEN_A) / SEPARACION_A;  
  let b = numeroCalleB(p);                 

  if (b === null || a < 0.5 || a > 31.5) {
    return nombreFueraDelCasco(p, q, datosParadas);
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
