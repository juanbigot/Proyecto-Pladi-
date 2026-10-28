
const VELOCIDAD_CAMINATA = 80;         
const VELOCIDAD_MICRO = 250;           
const ESPERA_MICRO = 6;                
const RADIOS_CAMINATA = [400, 800];     
const RADIO_COMBINACION = 250;         
const MAX_RESULTADOS = 5;               
const TAMANO_CELDA = 0.003;            


function distanciaMetros(a, b) {
  let dy = (a[0] - b[0]) * 111000;
  let dx = (a[1] - b[1]) * 111000 * Math.cos((a[0] * Math.PI) / 180);
  return Math.sqrt(dx * dx + dy * dy);
}

function claveCelda(fila, columna) {
  return fila + ',' + columna;
}



let datosGuardados = null;
let indiceGuardado = null;

function obtenerIndice(datosParadas) {
  if (datosGuardados !== datosParadas) {
    indiceGuardado = crearIndice(datosParadas);
    datosGuardados = datosParadas;
  }
  return indiceGuardado;
}

function crearIndice(datosParadas) {

  let paradasPorId = new Map();
  let celdas = new Map();

  for (let i = 0; i < datosParadas.paradas.length; i++) {
    let parada = datosParadas.paradas[i];
    paradasPorId.set(parada.id, parada);

    let clave = claveCelda(
      Math.floor(parada.coords[0] / TAMANO_CELDA),
      Math.floor(parada.coords[1] / TAMANO_CELDA)
    );
    if (!celdas.has(clave)) {
      celdas.set(clave, []);
    }
    celdas.get(clave).push(parada);
  }

  // línea por código (una línea puede agrupar varios códigos)
  let lineasPorCodigo = new Map();
  for (let i = 0; i < datosParadas.lineas.length; i++) {
    let linea = datosParadas.lineas[i];
    for (let j = 0; j < linea.codigos.length; j++) {
      lineasPorCodigo.set(linea.codigos[j], linea);
    }
  }

  let banderasPorParada = new Map();

  for (let i = 0; i < datosParadas.banderas.length; i++) {
    let bandera = datosParadas.banderas[i];

    let tieneRecorrido = bandera.recorrido && bandera.recorrido.length > 0;
    if (!tieneRecorrido || !lineasPorCodigo.has(bandera.linea)) {
      continue;
    }

    let completa = true;
    for (let j = 0; j < bandera.paradas.length; j++) {
      if (!paradasPorId.has(bandera.paradas[j])) {
        completa = false;
      }
    }
    if (!completa) {
      continue;
    }

    for (let j = 0; j < bandera.paradas.length; j++) {
      let id = bandera.paradas[j];
      if (!banderasPorParada.has(id)) {
        banderasPorParada.set(id, []);
      }
      banderasPorParada.get(id).push({ bandera: bandera, indice: j });
    }
  }

  return {
    paradasPorId: paradasPorId,
    celdas: celdas,
    lineasPorCodigo: lineasPorCodigo,
    banderasPorParada: banderasPorParada,
    acumuladas: new Map(),   
    vecinas: new Map(),      
    ubicaciones: new Map(),  
  };
}

function ubicacionEnRecorrido(bandera, indice) {
  let guardada = indice.ubicaciones.get(bandera.id);
  if (guardada) {
    return guardada;
  }

  let ubicacion = ubicarParadasEnRecorrido(bandera, indice.paradasPorId);
  indice.ubicaciones.set(bandera.id, ubicacion);
  return ubicacion;
}

function distanciasAcumuladas(bandera, indice) {
  let guardada = indice.acumuladas.get(bandera.id);
  if (guardada) {
    return guardada;
  }

  let acumulada = [0];
  for (let i = 1; i < bandera.paradas.length; i++) {
    let anterior = indice.paradasPorId.get(bandera.paradas[i - 1]);
    let actual = indice.paradasPorId.get(bandera.paradas[i]);
    acumulada.push(acumulada[i - 1] + distanciaMetros(anterior.coords, actual.coords));
  }

  indice.acumuladas.set(bandera.id, acumulada);
  return acumulada;
}

function paradasVecinas(parada, indice) {
  let guardada = indice.vecinas.get(parada.id);
  if (guardada) {
    return guardada;
  }

  let lista = [];
  let fila = Math.floor(parada.coords[0] / TAMANO_CELDA);
  let columna = Math.floor(parada.coords[1] / TAMANO_CELDA);

  for (let f = fila - 1; f <= fila + 1; f++) {
    for (let c = columna - 1; c <= columna + 1; c++) {
      let enCelda = indice.celdas.get(claveCelda(f, c));
      if (!enCelda) {
        continue;
      }
      for (let i = 0; i < enCelda.length; i++) {
        let otra = enCelda[i];
        let distancia = distanciaMetros(parada.coords, otra.coords);
        if (distancia <= RADIO_COMBINACION && indice.banderasPorParada.has(otra.id)) {
          lista.push({ parada: otra, distancia: distancia });
        }
      }
    }
  }

  indice.vecinas.set(parada.id, lista);
  return lista;
}


function paradasCerca(punto, radio, datosParadas) {
  let lista = [];
  for (let i = 0; i < datosParadas.paradas.length; i++) {
    let distancia = distanciaMetros(punto, datosParadas.paradas[i].coords);
    if (distancia <= radio) {
      lista.push({ parada: datosParadas.paradas[i], distancia: distancia });
    }
  }
  return lista;
}


function agruparPorBandera(cercanas, indice) {
  let porBandera = new Map();

  for (let i = 0; i < cercanas.length; i++) {
    let entradas = indice.banderasPorParada.get(cercanas[i].parada.id);
    if (!entradas) {
      continue;
    }

    for (let j = 0; j < entradas.length; j++) {
      let bandera = entradas[j].bandera;

      if (!porBandera.has(bandera.id)) {
        porBandera.set(bandera.id, { bandera: bandera, opciones: [] });
      }
      porBandera.get(bandera.id).opciones.push({
        indice: entradas[j].indice,
        distancia: cercanas[i].distancia,
      });
    }
  }

  return porBandera;
}


const METROS_POR_GRADO = 111000;

function crearProyeccion(latReferencia) {
  let factorLng = Math.cos((latReferencia * Math.PI) / 180);
  return {
    aMetros: function (p) {
      return [p[1] * METROS_POR_GRADO * factorLng, p[0] * METROS_POR_GRADO];
    },
  };
}

function proyectarEnSegmento(p, a, b) {
  let dx = b[0] - a[0];
  let dy = b[1] - a[1];
  let largo2 = dx * dx + dy * dy;

  let t = 0;
  if (largo2 > 0) {
    t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / largo2;
    if (t < 0) t = 0;
    if (t > 1) t = 1;
  }

  let px = a[0] + t * dx;
  let py = a[1] + t * dy;
  let ex = p[0] - px;
  let ey = p[1] - py;
  return { t: t, distancia: Math.sqrt(ex * ex + ey * ey) };
}

function ubicarParadasEnRecorrido(bandera, paradasPorId) {
  let recorrido = bandera.recorrido;
  let cantidadPuntos = recorrido.length;
  let cantidadParadas = bandera.paradas.length;

  let proyeccion = crearProyeccion(recorrido[0][0]);
  let puntos = [];
  for (let i = 0; i < cantidadPuntos; i++) {
    puntos.push(proyeccion.aMetros(recorrido[i]));
  }

  let acumulado = [0];
  let largos = [];
  for (let i = 0; i < cantidadPuntos - 1; i++) {
    let dx = puntos[i + 1][0] - puntos[i][0];
    let dy = puntos[i + 1][1] - puntos[i][1];
    let largo = Math.sqrt(dx * dx + dy * dy);
    largos.push(largo);
    acumulado.push(acumulado[i] + largo);
  }

  let cantidadSegmentos = cantidadPuntos - 1;
  if (cantidadSegmentos < 1) {
    return { acumulado: acumulado, posiciones: [] };
  }

  let anterior = new Float64Array(cantidadSegmentos);
  let actual = new Float64Array(cantidadSegmentos);
  let punteros = [];
  let parametros = [];

  for (let s = 0; s < cantidadParadas; s++) {
    let parada = paradasPorId.get(bandera.paradas[s]);
    let p = proyeccion.aMetros(parada.coords);

    let punteroFila = new Int32Array(cantidadSegmentos);
    let parametroFila = new Float32Array(cantidadSegmentos);

    let minimoHasta = Infinity;
    let indiceMinimo = 0;

    for (let j = 0; j < cantidadSegmentos; j++) {
      let proy = proyectarEnSegmento(p, puntos[j], puntos[j + 1]);
      parametroFila[j] = proy.t;

      if (s === 0) {
        actual[j] = proy.distancia;
        punteroFila[j] = -1;
      } else {
        if (anterior[j] < minimoHasta) {
          minimoHasta = anterior[j];
          indiceMinimo = j;
        }
        actual[j] = proy.distancia + minimoHasta;
        punteroFila[j] = indiceMinimo;
      }
    }

    punteros.push(punteroFila);
    parametros.push(parametroFila);

    let intercambio = anterior;
    anterior = actual;
    actual = intercambio;
  }

  let mejorSegmento = 0;
  for (let j = 1; j < cantidadSegmentos; j++) {
    if (anterior[j] < anterior[mejorSegmento]) {
      mejorSegmento = j;
    }
  }

  let segmentos = new Array(cantidadParadas);
  let j = mejorSegmento;
  for (let s = cantidadParadas - 1; s >= 0; s--) {
    segmentos[s] = j;
    j = punteros[s][j];
  }

  let posiciones = [];
  let ultima = 0;
  for (let s = 0; s < cantidadParadas; s++) {
    let seg = segmentos[s];
    let pos = acumulado[seg] + parametros[s][seg] * largos[seg];
    if (pos < ultima) {
      pos = ultima;
    }
    ultima = pos;

    let parada = paradasPorId.get(bandera.paradas[s]);
    let punto = puntoEnPosicion(recorrido, acumulado, pos);
    posiciones.push({
      posicion: pos,
      distancia: distanciaEnPlano(parada.coords, punto, proyeccion),
    });
  }

  return { acumulado: acumulado, posiciones: posiciones };
}

function distanciaEnPlano(a, b, proyeccion) {
  let pa = proyeccion.aMetros(a);
  let pb = proyeccion.aMetros(b);
  let dx = pa[0] - pb[0];
  let dy = pa[1] - pb[1];
  return Math.sqrt(dx * dx + dy * dy);
}

function primerVerticeDespuesDe(acumulado, metros) {
  let bajo = 0;
  let alto = acumulado.length;
  while (bajo < alto) {
    let medio = (bajo + alto) >> 1;
    if (acumulado[medio] > metros) {
      alto = medio;
    } else {
      bajo = medio + 1;
    }
  }
  return bajo;
}

function puntoEnPosicion(recorrido, acumulado, metros) {
  let i = primerVerticeDespuesDe(acumulado, metros);
  if (i <= 0) return recorrido[0];
  if (i >= recorrido.length) return recorrido[recorrido.length - 1];

  let largo = acumulado[i] - acumulado[i - 1];
  let t = 0;
  if (largo > 0) {
    t = (metros - acumulado[i - 1]) / largo;
  }
  return [
    recorrido[i - 1][0] + t * (recorrido[i][0] - recorrido[i - 1][0]),
    recorrido[i - 1][1] + t * (recorrido[i][1] - recorrido[i - 1][1]),
  ];
}

const DISTANCIA_MAXIMA_AL_RECORRIDO = 40;   

function cortarRecorrido(bandera, ubicacion, indiceSubida, indiceBajada, coordsSubida, coordsBajada) {
  let desde = ubicacion.posiciones[indiceSubida];
  let hasta = ubicacion.posiciones[indiceBajada];

  if (!desde || !hasta || hasta.posicion <= desde.posicion) {
    return [coordsSubida, coordsBajada];
  }

  let recorrido = bandera.recorrido;
  let acumulado = ubicacion.acumulado;

  let linea = [puntoEnPosicion(recorrido, acumulado, desde.posicion)];

  let i = primerVerticeDespuesDe(acumulado, desde.posicion);
  while (i < recorrido.length && acumulado[i] < hasta.posicion) {
    linea.push(recorrido[i]);
    i++;
  }
  linea.push(puntoEnPosicion(recorrido, acumulado, hasta.posicion));

  if (desde.distancia > DISTANCIA_MAXIMA_AL_RECORRIDO) {
    linea.unshift(coordsSubida);
  }
  if (hasta.distancia > DISTANCIA_MAXIMA_AL_RECORRIDO) {
    linea.push(coordsBajada);
  }

  return linea;
}


function crearTramo(bandera, indiceSubida, indiceBajada, indice) {
  let subida = indice.paradasPorId.get(bandera.paradas[indiceSubida]);
  let bajada = indice.paradasPorId.get(bandera.paradas[indiceBajada]);

  return {
    linea: indice.lineasPorCodigo.get(bandera.linea),
    bandera: bandera,
    subida: subida,
    bajada: bajada,
    cantidadParadas: indiceBajada - indiceSubida,
    recorrido: cortarRecorrido(
      bandera,
      ubicacionEnRecorrido(bandera, indice),
      indiceSubida,
      indiceBajada,
      subida.coords,
      bajada.coords
    ),
  };
}

function sumar(numeros) {
  let total = 0;
  for (let i = 0; i < numeros.length; i++) {
    total = total + numeros[i];
  }
  return total;
}

function crearViaje(tipo, minutos, caminatas, tramos) {
  return {
    tipo: tipo,
    minutos: Math.round(minutos),
    caminatas: caminatas,                       
    caminataTotal: Math.round(sumar(caminatas)),
    tramos: tramos,
  };
}

function ordenarYRecortar(mapa) {
  let lista = Array.from(mapa.values());
  lista.sort(function (a, b) {
    return a.minutos - b.minutos;
  });
  return lista.slice(0, MAX_RESULTADOS);
}


function buscarDirectos(subidas, bajadas, indice) {
  let mejoresPorLinea = new Map();

  subidas.forEach(function (subida, idBandera) {
    let bajada = bajadas.get(idBandera);
    if (!bajada) {
      return;
    }

    let acumulada = distanciasAcumuladas(subida.bandera, indice);
    let mejor = null;

    for (let i = 0; i < subida.opciones.length; i++) {
      for (let j = 0; j < bajada.opciones.length; j++) {
        let desde = subida.opciones[i];
        let hasta = bajada.opciones[j];

        if (hasta.indice <= desde.indice) {
          continue;
        }

        let minutos =
          desde.distancia / VELOCIDAD_CAMINATA +
          ESPERA_MICRO +
          (acumulada[hasta.indice] - acumulada[desde.indice]) / VELOCIDAD_MICRO +
          hasta.distancia / VELOCIDAD_CAMINATA;

        if (mejor === null || minutos < mejor.minutos) {
          mejor = { minutos: minutos, desde: desde, hasta: hasta };
        }
      }
    }

    if (mejor === null) {
      return;
    }

    let tramo = crearTramo(subida.bandera, mejor.desde.indice, mejor.hasta.indice, indice);
    let viaje = crearViaje(
      'directo',
      mejor.minutos,
      [mejor.desde.distancia, mejor.hasta.distancia],
      [tramo]
    );

    // de cada línea se queda con su mejor variante
    let actual = mejoresPorLinea.get(tramo.linea.abbr);
    if (!actual || viaje.minutos < actual.minutos) {
      mejoresPorLinea.set(tramo.linea.abbr, viaje);
    }
  });

  return ordenarYRecortar(mejoresPorLinea);
}


function buscarCombinaciones(subidas, bajadas, indice) {
  let mejoresPorPar = new Map();

  subidas.forEach(function (subida) {
    let banderaA = subida.bandera;
    let lineaA = indice.lineasPorCodigo.get(banderaA.linea);
    let acumuladaA = distanciasAcumuladas(banderaA, indice);

    for (let m = 1; m < banderaA.paradas.length; m++) {

      let mejorSubida = null;
      for (let i = 0; i < subida.opciones.length; i++) {
        let desde = subida.opciones[i];
        if (desde.indice >= m) {
          continue;
        }
        let minutos =
          desde.distancia / VELOCIDAD_CAMINATA +
          ESPERA_MICRO +
          (acumuladaA[m] - acumuladaA[desde.indice]) / VELOCIDAD_MICRO;

        if (mejorSubida === null || minutos < mejorSubida.minutos) {
          mejorSubida = { minutos: minutos, desde: desde };
        }
      }
      if (mejorSubida === null) {
        continue;
      }

      let paradaDeBajada = indice.paradasPorId.get(banderaA.paradas[m]);
      let vecinas = paradasVecinas(paradaDeBajada, indice);

      for (let v = 0; v < vecinas.length; v++) {
        let entradas = indice.banderasPorParada.get(vecinas[v].parada.id);

        for (let e = 0; e < entradas.length; e++) {
          let banderaB = entradas[e].bandera;
          let posicionB = entradas[e].indice;

          let llegada = bajadas.get(banderaB.id);
          if (!llegada) {
            continue;
          }

          let lineaB = indice.lineasPorCodigo.get(banderaB.linea);
          if (lineaB.abbr === lineaA.abbr) {
            continue;
          }

          let acumuladaB = distanciasAcumuladas(banderaB, indice);
          let mejorBajada = null;
          for (let k = 0; k < llegada.opciones.length; k++) {
            let hasta = llegada.opciones[k];
            if (hasta.indice <= posicionB) {
              continue;
            }
            let minutos =
              (acumuladaB[hasta.indice] - acumuladaB[posicionB]) / VELOCIDAD_MICRO +
              hasta.distancia / VELOCIDAD_CAMINATA;

            if (mejorBajada === null || minutos < mejorBajada.minutos) {
              mejorBajada = { minutos: minutos, hasta: hasta };
            }
          }
          if (mejorBajada === null) {
            continue;
          }

          let total =
            mejorSubida.minutos +
            vecinas[v].distancia / VELOCIDAD_CAMINATA +
            ESPERA_MICRO +
            mejorBajada.minutos;

          let clave = lineaA.abbr + '|' + lineaB.abbr;
          let actual = mejoresPorPar.get(clave);

          if (!actual || total < actual.minutos) {
            mejoresPorPar.set(clave, {
              minutos: total,
              banderaA: banderaA,
              subidaA: mejorSubida.desde,
              bajadaA: m,
              banderaB: banderaB,
              subidaB: posicionB,
              bajadaB: mejorBajada.hasta,
              caminataCombinacion: vecinas[v].distancia,
            });
          }
        }
      }
    }
  });

  let viajes = new Map();
  mejoresPorPar.forEach(function (c, clave) {
    let tramoA = crearTramo(c.banderaA, c.subidaA.indice, c.bajadaA, indice);
    let tramoB = crearTramo(c.banderaB, c.subidaB, c.bajadaB.indice, indice);

    viajes.set(
      clave,
      crearViaje(
        'combinacion',
        c.minutos,
        [c.subidaA.distancia, c.caminataCombinacion, c.bajadaB.distancia],
        [tramoA, tramoB]
      )
    );
  });

  return ordenarYRecortar(viajes);
}


export function buscarViajes(origen, destino, datosParadas) {
  let indice = obtenerIndice(datosParadas);
  let distanciaDirecta = Math.round(distanciaMetros(origen, destino));

  for (let r = 0; r < RADIOS_CAMINATA.length; r++) {
    let radio = RADIOS_CAMINATA[r];

    let subidas = agruparPorBandera(paradasCerca(origen, radio, datosParadas), indice);
    let bajadas = agruparPorBandera(paradasCerca(destino, radio, datosParadas), indice);

    let directos = buscarDirectos(subidas, bajadas, indice);
    let combinaciones = buscarCombinaciones(subidas, bajadas, indice);

    if (directos.length > 0) {
      let mejorDirecto = directos[0].minutos;
      combinaciones = combinaciones.filter(function (viaje) {
        return viaje.minutos < mejorDirecto;
      });
    }

    if (directos.length > 0 || combinaciones.length > 0) {
      return { directos: directos, combinaciones: combinaciones, distanciaDirecta: distanciaDirecta };
    }
  }

  return { directos: [], combinaciones: [], distanciaDirecta: distanciaDirecta };
}
