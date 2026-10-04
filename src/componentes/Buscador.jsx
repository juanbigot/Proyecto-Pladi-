import React, { useState } from 'react';

const IconoCorazon = ({ relleno, color }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={relleno ? color : 'none'} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"></path>
  </svg>
);

const IconoLupa = ({ color }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const IconoFlechaAtras = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);


function crearLineasVisibles(lineas, valor) {
  let resultado = {};
  for (let i = 0; i < lineas.length; i++) {
    resultado[lineas[i].abbr] = valor;
  }
  return resultado;
}

function crearFavoritosIniciales(paradas) {
  let resultado = [];
  for (let i = 0; i < 3; i++) {
    resultado.push(paradas[i].id);
  }
  return resultado;
}

function buscarLineaPorCodigo(codigo, lineas) {
  for (let i = 0; i < lineas.length; i++) {
    for (let j = 0; j < lineas[i].codigos.length; j++) {
      if (lineas[i].codigos[j] === codigo) {
        return lineas[i];
      }
    }
  }
  return null;
}

function obtenerColorLinea(linea) {
  let color = '#0d9be0';
  if (linea && linea.colors && linea.colors.accent) {
    color = linea.colors.accent;
  }
  return color;
}

function obtenerColorTexto(linea) {
  let color = '#ffffff';
  if (linea && linea.colors && linea.colors.text) {
    color = linea.colors.text;
  }
  return color;
}

function buscarParadas(texto, paradas) {
  let resultados = [];
  let buscado = texto.trim().toLowerCase();

  if (buscado === '') {
    return resultados;
  }

  for (let i = 0; i < paradas.length; i++) {
    let parada = paradas[i];
    let coincide = false;

    if (parada.id.toLowerCase().indexOf(buscado) !== -1) {
      coincide = true;
    }

    for (let j = 0; j < parada.calle.length; j++) {
      if (parada.calle[j].toLowerCase().indexOf(buscado) !== -1) {
        coincide = true;
      }
    }

    if (coincide) {
      resultados.push(parada);
    }

    if (resultados.length >= 8) {
      break;
    }
  }

  return resultados;
}

function obtenerParadasFavoritas(favoritos, paradas) {
  let resultado = [];
  for (let i = 0; i < paradas.length; i++) {
    for (let j = 0; j < favoritos.length; j++) {
      if (paradas[i].id === favoritos[j]) {
        resultado.push(paradas[i]);
      }
    }
  }
  return resultado;
}

function contarLineasTildadas(lineasVisibles) {
  let cantidad = 0;
  let claves = Object.keys(lineasVisibles);
  for (let i = 0; i < claves.length; i++) {
    if (lineasVisibles[claves[i]] === true) {
      cantidad = cantidad + 1;
    }
  }
  return cantidad;
}

function generarSalidas(parada, datosParadas) {
  let salidas = [];

  for (let i = 0; i < datosParadas.banderas.length; i++) {
    let bandera = datosParadas.banderas[i];

    if (bandera.paradas.indexOf(parada.id) === -1) {
      continue;
    }

    let linea = buscarLineaPorCodigo(bandera.linea, datosParadas.lineas);
    if (linea === null) {
      continue;
    }

    let semilla = parada.codigo + bandera.id.length + i;
    let tiempo = 5 + (semilla % 55);

    salidas.push({
      id: bandera.id,
      linea: linea,
      bandera: bandera,
      tiempo: tiempo,
    });
  }

  salidas.sort(function (a, b) {
    return a.tiempo - b.tiempo;
  });

  return salidas;
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

function puntajeVuelta(a, b) {
  let ra = a.recorrido;
  let rb = b.recorrido;
  let extremos = distanciaKm(ra[0], rb[rb.length - 1]) + distanciaKm(ra[ra.length - 1], rb[0]);
  return extremos + distanciaMediaEntreRecorridos(ra, rb) + distanciaMediaEntreRecorridos(rb, ra);
}

function buscarBanderaVuelta(banderaIda, banderas) {
  if (!banderaIda.recorrido || banderaIda.recorrido.length === 0) {
    return null;
  }

  let mejor = null;
  let mejorPuntaje = Infinity;

  for (let i = 0; i < banderas.length; i++) {
    let otra = banderas[i];

    if (otra.linea !== banderaIda.linea || otra.id === banderaIda.id) {
      continue;
    }
    if (!otra.recorrido || otra.recorrido.length === 0) {
      continue;
    }

    let puntaje = puntajeVuelta(banderaIda, otra);
    if (puntaje < mejorPuntaje) {
      mejorPuntaje = puntaje;
      mejor = otra;
    }
  }

  if (mejorPuntaje > LIMITE_VUELTA_KM) {
    return null;
  }
  return mejor;
}

function Buscador({ seccionActiva, datosParadas, lineaSeleccionada, onSeleccionarLinea, mapa, onMostrarBandera, paradaSeleccionada, onElegirParada, lineasVisibles, onCambiarLineasVisibles }) {

  const [texto, setTexto] = useState('');
  const [verFavoritos, setVerFavoritos] = useState(false);
  const [favoritos, setFavoritos] = useState(crearFavoritosIniciales(datosParadas.paradas));
  const [salidaSeleccionada, setSalidaSeleccionada] = useState(null);
  const [sentido, setSentido] = useState('ida');
  const [banderaVuelta, setBanderaVuelta] = useState(null);

  function alternarLinea(abbr) {
    let nuevas = { ...lineasVisibles };
    nuevas[abbr] = !nuevas[abbr];
    onCambiarLineasVisibles(nuevas);
  }

  function limpiarLineas() {
    onCambiarLineasVisibles(crearLineasVisibles(datosParadas.lineas, false));
  }

  function esFavorito(idParada) {
    for (let i = 0; i < favoritos.length; i++) {
      if (favoritos[i] === idParada) {
        return true;
      }
    }
    return false;
  }

  function alternarFavorito(idParada) {
    if (esFavorito(idParada)) {
      let nuevos = [];
      for (let i = 0; i < favoritos.length; i++) {
        if (favoritos[i] !== idParada) {
          nuevos.push(favoritos[i]);
        }
      }
      setFavoritos(nuevos);
    } else {
      setFavoritos([...favoritos, idParada]);
    }
  }

  function mostrarBandera(bandera) {
    onMostrarBandera(bandera);

    if (bandera !== null && bandera.recorrido.length > 0) {
      mapa.flyToBounds(bandera.recorrido, { padding: [60, 60] });
    }
  }

  function elegirParada(parada) {
    onElegirParada(parada);
    setSalidaSeleccionada(null);
    setTexto('');
    setVerFavoritos(false);
    mapa.flyTo(parada.coords, 18);
  }

  function volverDeParada() {
    onElegirParada(null);
    setSalidaSeleccionada(null);
    onMostrarBandera(null);
  }

  function elegirSalida(salida) {
    setSalidaSeleccionada(salida);
    setSentido('ida');
    setBanderaVuelta(buscarBanderaVuelta(salida.bandera, datosParadas.banderas));
    mostrarBandera(salida.bandera);
  }

  function volverDeSalida() {
    setSalidaSeleccionada(null);
    onMostrarBandera(null);
    mapa.flyTo(paradaSeleccionada.coords, 18);
  }

  function cambiarSentido(nuevoSentido) {
    setSentido(nuevoSentido);

    if (nuevoSentido === 'vuelta' && banderaVuelta !== null) {
      mostrarBandera(banderaVuelta);
    } else {
      mostrarBandera(salidaSeleccionada.bandera);
    }
  }

  function dibujarBarraBusqueda() {
    let iconoBoton = <IconoCorazon relleno={verFavoritos} color="#ffffff" />;
    let alHacerClickEnBoton = () => setVerFavoritos(!verFavoritos);

    if (texto !== '') {
      iconoBoton = <IconoLupa color="#ffffff" />;
      alHacerClickEnBoton = () => {};
    }

    return (
      <div className="buscador__fila">
        <input
          type="text"
          placeholder="Buscar por número"
          className="buscador__input buscador__input--gris"
          value={texto}
          onChange={(evento) => {
            setTexto(evento.target.value);
            setVerFavoritos(false);
          }}
        />
        <button type="button" className="buscador__btn-azul" onClick={alHacerClickEnBoton}>
          {iconoBoton}
        </button>
      </div>
    );
  }

  function dibujarFilaParada(parada) {
    return (
      <button
        key={parada.id}
        type="button"
        className="fila-parada"
        onClick={() => elegirParada(parada)}
      >
        <span className="fila-parada__id">{parada.id}</span>
        <span className="fila-parada__calle">{parada.calle.join(' y ')}</span>
      </button>
    );
  }

  
  if (seccionActiva === 'direccion') {
    return (
      <div className="buscador-container">
        <div className="buscador-card buscador-card--doble">
          <div className="buscador__campo">
            <input
              type="text"
              placeholder="Ubicación inicial"
              className="buscador__input"
            />
          </div>

          <div className="buscador__campo">
            <input
              type="text"
              placeholder="Ubicación final"
              className="buscador__input"
            />
          </div>
        </div>
      </div>
    );
  }

  if (seccionActiva === 'recorrido') {
    return (
      <div className="buscador-container">
        <div className="buscador-card">
          <select
            className="buscador__input"
            value={lineaSeleccionada}
            onChange={(evento) => onSeleccionarLinea(evento.target.value)}
          >
            {datosParadas.lineas.map((linea) => (
              <option key={linea.abbr} value={linea.abbr}>
                Línea {linea.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

 
  if (seccionActiva === 'paradas') {

    if (salidaSeleccionada !== null) {
      let banderaActual = salidaSeleccionada.bandera;
      if (sentido === 'vuelta' && banderaVuelta !== null) {
        banderaActual = banderaVuelta;
      }

      let claseIda = 'boton-sentido';
      if (sentido === 'ida') {
        claseIda = 'boton-sentido boton-sentido--activo';
      }

      let claseVuelta = 'boton-sentido';
      if (sentido === 'vuelta') {
        claseVuelta = 'boton-sentido boton-sentido--activo';
      }

      return (
        <div className="buscador-container">
          <div className="buscador-card buscador-card--columna">

            <div className="cabecera-detalle">
              <button type="button" className="boton-atras" onClick={volverDeSalida}>
                <IconoFlechaAtras />
              </button>
              <span
                className="badge-linea"
                style={{
                  backgroundColor: obtenerColorLinea(salidaSeleccionada.linea),
                  color: obtenerColorTexto(salidaSeleccionada.linea),
                }}
              >
                {salidaSeleccionada.linea.nombre}
              </span>
              <span className="cabecera-detalle__texto">{banderaActual.nombre}</span>
            </div>

            <div className="toggle-sentido">
              <button type="button" className={claseIda} onClick={() => cambiarSentido('ida')}>
                Ida
              </button>
              <button
                type="button"
                className={claseVuelta}
                onClick={() => cambiarSentido('vuelta')}
                disabled={banderaVuelta === null}
              >
                Vuelta
              </button>
            </div>

          </div>
        </div>
      );
    }

    if (paradaSeleccionada !== null) {
      let salidas = generarSalidas(paradaSeleccionada, datosParadas);

      return (
        <div className="buscador-container">
          <div className="buscador-card buscador-card--columna">

            <div className="cabecera-detalle">
              <button type="button" className="boton-atras" onClick={volverDeParada}>
                <IconoFlechaAtras />
              </button>

              <div className="cabecera-detalle__info">
                <div className="cabecera-detalle__titulo">Parada {paradaSeleccionada.id}</div>
                <div className="cabecera-detalle__subtitulo">{paradaSeleccionada.calle.join(' y ')}</div>
              </div>

              <button
                type="button"
                className="boton-favorito"
                onClick={() => alternarFavorito(paradaSeleccionada.id)}
              >
                <IconoCorazon relleno={esFavorito(paradaSeleccionada.id)} color="#e63946" />
              </button>
            </div>

            <div className="buscador__separador"></div>

            <div className="buscador__encabezado">
              <span>PRÓXIMAS SALIDAS</span>
            </div>

            {salidas.length === 0 && (
              <div className="buscador__ayuda">No hay salidas para esta parada.</div>
            )}

            {salidas.map((salida) => (
              <button
                key={salida.id}
                type="button"
                className="fila-salida"
                onClick={() => elegirSalida(salida)}
              >
                <span
                  className="fila-salida__color"
                  style={{ backgroundColor: obtenerColorLinea(salida.linea) }}
                ></span>
                <span className="fila-salida__info">
                  <span className="fila-salida__linea">{salida.linea.nombre}</span>
                  <span className="fila-salida__destino">{salida.bandera.nombre}</span>
                </span>
                <span className="fila-salida__tiempo">{salida.tiempo} min</span>
              </button>
            ))}

          </div>
        </div>
      );
    }

  
    if (texto !== '') {
      let resultados = buscarParadas(texto, datosParadas.paradas);

      return (
        <div className="buscador-container">
          <div className="buscador-card buscador-card--columna">

            {dibujarBarraBusqueda()}

            <div className="buscador__separador"></div>

            <div className="buscador__encabezado">
              <span>RESULTADOS</span>
            </div>

            {resultados.length === 0 && (
              <div className="buscador__ayuda">No se encontraron paradas.</div>
            )}

            {resultados.map((parada) => dibujarFilaParada(parada))}

          </div>
        </div>
      );
    }

    if (verFavoritos) {
      let paradasFavoritas = obtenerParadasFavoritas(favoritos, datosParadas.paradas);

      return (
        <div className="buscador-container">
          <div className="buscador-card buscador-card--columna">

            {dibujarBarraBusqueda()}

            <div className="buscador__separador"></div>

            <div className="buscador__encabezado">
              <span>FAVORITOS</span>
            </div>

            {paradasFavoritas.length === 0 && (
              <div className="buscador__ayuda">Todavía no tenés paradas favoritas.</div>
            )}

            {paradasFavoritas.map((parada) => dibujarFilaParada(parada))}

          </div>
        </div>
      );
    }

    let cantidadTildadas = contarLineasTildadas(lineasVisibles);
    let nombreDeLaUnicaTildada = '';

    if (cantidadTildadas === 1) {
      for (let i = 0; i < datosParadas.lineas.length; i++) {
        if (lineasVisibles[datosParadas.lineas[i].abbr] === true) {
          nombreDeLaUnicaTildada = datosParadas.lineas[i].nombre;
        }
      }
    }

    return (
      <div className="buscador-container">
        <div className="buscador-card buscador-card--columna">

          {dibujarBarraBusqueda()}

          <div className="buscador__separador"></div>

          <div className="buscador__encabezado">
            <span>MOSTRAR LÍNEAS EN MAPA</span>
            <button type="button" className="buscador__link" onClick={limpiarLineas}>
              Limpiar
            </button>
          </div>

          <div className="lista-lineas">
            {datosParadas.lineas.map((linea) => {

              let tildada = lineasVisibles[linea.abbr] === true;

              let claseFila = 'fila-linea';
              let textoEstado = 'Oculto';
              if (tildada) {
                claseFila = 'fila-linea fila-linea--activa';
                textoEstado = 'Activo';
              }

              return (
                <label key={linea.abbr} className={claseFila}>
                  <input
                    type="checkbox"
                    checked={tildada}
                    onChange={() => alternarLinea(linea.abbr)}
                  />
                  <span
                    className="fila-linea__color"
                    style={{ backgroundColor: obtenerColorLinea(linea) }}
                  ></span>
                  <span className="fila-linea__nombre">Línea {linea.nombre}</span>
                  <span className="fila-linea__estado">{textoEstado}</span>
                </label>
              );
            })}
          </div>

          {cantidadTildadas === datosParadas.lineas.length && (
            <div className="buscador__ayuda">
              Selecciona líneas para ver sus paradas en tiempo real.
            </div>
          )}

          {cantidadTildadas === 1 && (
            <div className="buscador__ayuda">
              Mostrando únicamente paradas para la Línea {nombreDeLaUnicaTildada} activa.
            </div>
          )}

        </div>
      </div>
    );
  }

  return null;
}

export default Buscador;