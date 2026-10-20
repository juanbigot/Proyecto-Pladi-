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
  };
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


function crearTramo(bandera, indiceSubida, indiceBajada, indice) {
  return {
    linea: indice.lineasPorCodigo.get(bandera.linea),
    bandera: bandera,
    subida: indice.paradasPorId.get(bandera.paradas[indiceSubida]),
    bajada: indice.paradasPorId.get(bandera.paradas[indiceBajada]),
    cantidadParadas: indiceBajada - indiceSubida,
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
