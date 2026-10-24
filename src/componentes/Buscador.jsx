import React, { useState, useEffect, useMemo, useRef } from 'react';
import { buscarViajes } from '../buscarViajes.js';
import { ubicarDireccion, direccionDePunto } from '../ubicarDireccion.js';
import { colorDeRamal } from './CapaRecorridos.jsx';

const IconoCorazon = ({ relleno, color }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={relleno ? color : 'none'} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"></path>
  </svg>
);

const IconoLupa = ({ color }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const IconoChevron = ({ arriba }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points={arriba ? '6 15 12 9 18 15' : '6 9 12 15 18 9'}></polyline>
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

function buscarLineas(texto, lineas) {
  let buscado = texto.trim().toLowerCase();
  let resultado = [];

  for (let i = 0; i < lineas.length; i++) {
    let nombre = lineas[i].nombre.toLowerCase();
    let abbr = lineas[i].abbr.toLowerCase();

    if (nombre.includes(buscado) || abbr.includes(buscado)) {
      resultado.push(lineas[i]);
    }
  }

  return resultado;
}

function obtenerRamales(linea, banderas) {
  let ramales = [];

  for (let i = 0; i < banderas.length; i++) {
    let bandera = banderas[i];
    let tieneRecorrido = bandera.recorrido && bandera.recorrido.length > 0;

    if (linea.codigos.includes(bandera.linea) && tieneRecorrido) {
      ramales.push(bandera);
    }
  }

  return ramales;
}


function centrarEnZonaLibre(mapa, coords, zoom) {
  let contenedor = mapa.getContainer().getBoundingClientRect();
  let ancho = contenedor.width;
  let alto = contenedor.height;

  let zona = { izquierda: 0, arriba: 0, derecha: ancho, abajo: alto };

  let barra = document.querySelector('.nav');
  if (barra) {
    let r = barra.getBoundingClientRect();
    if (r.height > 0) {
      if (r.top - contenedor.top > alto / 2) {
        zona.abajo = r.top - contenedor.top;
      } else {
        zona.arriba = r.bottom - contenedor.top;
      }
    }
  }

 
  let tarjeta = document.querySelector('.buscador-card');
  if (tarjeta) {
    let t = tarjeta.getBoundingClientRect();
    if (t.right - contenedor.left < ancho * 0.6) {
      zona.izquierda = t.right - contenedor.left;
    } else {
      zona.arriba = Math.max(zona.arriba, t.bottom - contenedor.top);
    }
  }

 
  if (zona.derecha - zona.izquierda < 120 || zona.abajo - zona.arriba < 120) {
    mapa.flyTo(coords, zoom);
    return;
  }

  let destinoX = (zona.izquierda + zona.derecha) / 2;
  let destinoY = (zona.arriba + zona.abajo) / 2;


  let punto = mapa.project(coords, zoom);
  let centro = mapa.unproject(punto.add([ancho / 2 - destinoX, alto / 2 - destinoY]), zoom);
  mapa.flyTo(centro, zoom);
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

function formatearMetros(metros) {
  if (metros < 1000) {
    return Math.round(metros / 10) * 10 + ' m';
  }
  return (metros / 1000).toFixed(1) + ' km';
}

function nombreParada(parada) {
  return parada.id + ' (' + parada.calle.join(' y ') + ')';
}

const MENSAJE_ERROR_UBICACION = 'Hubo un fallo en la redacción de la ubicación';

async function buscarDireccion(texto) {
  let url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ar' +
    '&viewbox=-58.2,-34.7,-57.7,-35.1&bounded=1&q=' +
    encodeURIComponent(texto + ', La Plata');

  let respuesta = await fetch(url);
  let datos = await respuesta.json();

  if (datos.length === 0) {
    return null;
  }
  return [parseFloat(datos[0].lat), parseFloat(datos[0].lon)];
}

async function buscarNombreDePunto(punto) {
  let url =
    'https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&lat=' + punto[0] + '&lon=' + punto[1];

  let respuesta = await fetch(url);
  let datos = await respuesta.json();

  if (!datos.address || !datos.address.road) {
    return null;
  }

  let texto = datos.address.road;
  if (datos.address.house_number) {
    texto = texto + ' ' + datos.address.house_number;
  }

  let a = datos.address;
  let localidad = a.suburb || a.town || a.village || a.city_district || a.city;
  if (localidad) {
    texto = texto + ', ' + localidad;
  }
  return texto;
}

function Buscador({ seccionActiva, datosParadas, lineaSeleccionada, onSeleccionarLinea, mapa, onMostrarBandera, paradaSeleccionada, onElegirParada, lineasVisibles, onCambiarLineasVisibles, ramalesOcultos, onCambiarRamalesOcultos, origen, destino, viajeElegido, onCambiarOrigen, onCambiarDestino, onElegirViaje }) {

  const [texto, setTexto] = useState('');
  const [verFavoritos, setVerFavoritos] = useState(false);
  const [favoritos, setFavoritos] = useState(crearFavoritosIniciales(datosParadas.paradas));
  const [salidaSeleccionada, setSalidaSeleccionada] = useState(null);
  const [sentido, setSentido] = useState('ida');
  const [banderaVuelta, setBanderaVuelta] = useState(null);
  const [textoLinea, setTextoLinea] = useState('');
  const [textoOrigen, setTextoOrigen] = useState('');
  const [textoDestino, setTextoDestino] = useState('');
  const [campoActivo, setCampoActivo] = useState('origen');
  const [mensaje, setMensaje] = useState('');
  const ultimoPunto = useRef({ origen: null, destino: null });
  const [plegado, setPlegado] = useState(false);


  useEffect(() => {
    setPlegado(false);
  }, [seccionActiva, paradaSeleccionada, viajeElegido, lineaSeleccionada, verFavoritos]);

  useEffect(() => {
    if (origen !== null && destino !== null) {
      setPlegado(false);
    }
  }, [origen, destino]);

  const resultados = useMemo(() => {
    if (origen === null || destino === null) {
      return null;
    }
    return buscarViajes(origen, destino, datosParadas);
  }, [origen, destino, datosParadas]);

  useEffect(() => {
    if (mapa === null || seccionActiva !== 'direccion') {
      return;
    }

    function alHacerClickEnElMapa(evento) {
      let punto = [evento.latlng.lat, evento.latlng.lng];

      if (campoActivo === 'origen') {
        onCambiarOrigen(punto);
        escribirDireccion('origen', punto);
        setCampoActivo('destino');
      } else {
        onCambiarDestino(punto);
        escribirDireccion('destino', punto);
      }
      onElegirViaje(null);
      setMensaje('');
    }

    mapa.on('click', alHacerClickEnElMapa);

    return () => {
      mapa.off('click', alHacerClickEnElMapa);
    };
  }, [mapa, seccionActiva, campoActivo]);

  function alternarLinea(abbr) {
    let nuevas = { ...lineasVisibles };
    nuevas[abbr] = !nuevas[abbr];
    onCambiarLineasVisibles(nuevas);
  }

  function mostrarTodasLasLineas() {
    onCambiarLineasVisibles(crearLineasVisibles(datosParadas.lineas, true));
  }

  function ocultarTodasLasLineas() {
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

  function centrarParada(coords) {
    setTimeout(() => centrarEnZonaLibre(mapa, coords, 18), 80);
  }

  useEffect(() => {
    if (paradaSeleccionada === null || !mapa) {
      return;
    }
    let temporizador = setTimeout(() => centrarEnZonaLibre(mapa, paradaSeleccionada.coords, 18), 80);
    return () => clearTimeout(temporizador);
  }, [paradaSeleccionada]);

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
    centrarParada(paradaSeleccionada.coords);
  }

  function cambiarSentido(nuevoSentido) {
    setSentido(nuevoSentido);

    if (nuevoSentido === 'vuelta' && banderaVuelta !== null) {
      mostrarBandera(banderaVuelta);
    } else {
      mostrarBandera(salidaSeleccionada.bandera);
    }
  }

  function elegirLinea(linea) {
    onSeleccionarLinea(linea.abbr);
    setTextoLinea(linea.nombre);   
  }

  function escribirLinea(texto) {
    setTextoLinea(texto);

    if (texto === '' && lineaSeleccionada !== null) {
      onSeleccionarLinea(null);
    }
  }

  function alternarRamal(idBandera) {
    let nuevos = { ...ramalesOcultos };
    if (nuevos[idBandera] === true) {
      delete nuevos[idBandera];
    } else {
      nuevos[idBandera] = true;
    }
    onCambiarRamalesOcultos(nuevos);
  }

  function mostrarTodosLosRamales() {
    onCambiarRamalesOcultos({});
  }

  function ocultarTodosLosRamales(ramales) {
    let nuevos = {};
    for (let i = 0; i < ramales.length; i++) {
      nuevos[ramales[i].id] = true;
    }
    onCambiarRamalesOcultos(nuevos);
  }

  function ponerTexto(campo, texto) {
    if (campo === 'origen') {
      setTextoOrigen(texto);
    } else {
      setTextoDestino(texto);
    }
  }

  async function escribirDireccion(campo, punto) {
    ultimoPunto.current[campo] = punto;

    let texto = direccionDePunto(punto);
    if (texto !== null) {
      ponerTexto(campo, texto);
      return;
    }

    ponerTexto(campo, punto[0].toFixed(5) + ', ' + punto[1].toFixed(5));

    try {
      let nombre = await buscarNombreDePunto(punto);

      if (nombre !== null && ultimoPunto.current[campo] === punto) {
        ponerTexto(campo, nombre);
      }
    } catch (error) {
    }
  }

  async function buscarPunto(campo, texto) {
    if (texto.trim() === '') {
      return;
    }

    let punto = null;

    let local = ubicarDireccion(texto, datosParadas);

    if (local !== null && local.error) {
      setMensaje(MENSAJE_ERROR_UBICACION);
      return;
    }

    if (local !== null) {
      punto = local.punto;
    } else {
      setMensaje('Buscando...');

      try {
        punto = await buscarDireccion(texto);
      } catch (error) {
        setMensaje(MENSAJE_ERROR_UBICACION);
        return;
      }

      if (punto === null) {
        setMensaje(MENSAJE_ERROR_UBICACION);
        return;
      }
    }

    ultimoPunto.current[campo] = punto;
    setMensaje('');

    let otroPunto = destino;
    if (campo === 'origen') {
      onCambiarOrigen(punto);
      setCampoActivo('destino');
    } else {
      otroPunto = origen;
      onCambiarDestino(punto);
    }
    onElegirViaje(null);

    if (otroPunto !== null) {
      mapa.flyToBounds([punto, otroPunto], { padding: [60, 60] });
    } else {
      mapa.flyTo(punto, 16);
    }
  }

  function cambiarTextoPunto(campo, valor) {
    ultimoPunto.current[campo] = null;

    if (campo === 'origen') {
      setTextoOrigen(valor);
    } else {
      setTextoDestino(valor);
    }

    if (valor === '') {
      if (campo === 'origen') {
        onCambiarOrigen(null);
      } else {
        onCambiarDestino(null);
      }
      onElegirViaje(null);
    }
  }

  function limpiarPuntos() {
    ultimoPunto.current = { origen: null, destino: null };
    onCambiarOrigen(null);
    onCambiarDestino(null);
    onElegirViaje(null);
    setTextoOrigen('');
    setTextoDestino('');
    setCampoActivo('origen');
    setMensaje('');
  }

  function elegirViaje(viaje) {
    onElegirViaje(viaje);

    let puntos = [origen, destino];
    for (let i = 0; i < viaje.tramos.length; i++) {
      puntos.push(viaje.tramos[i].subida.coords);
      puntos.push(viaje.tramos[i].bajada.coords);
    }
    mapa.flyToBounds(puntos, { padding: [60, 60] });
  }

  function volverDeViaje() {
    onElegirViaje(null);
    mapa.flyToBounds([origen, destino], { padding: [60, 60] });
  }

  function dibujarFilaViaje(viaje, indice) {
    let nombresLineas = [];
    for (let i = 0; i < viaje.tramos.length; i++) {
      nombresLineas.push(viaje.tramos[i].linea.nombre);
    }

    let detalle = viaje.tramos[0].bandera.nombre;
    if (viaje.tipo === 'combinacion') {
      detalle = 'Combinás en la parada ' + viaje.tramos[0].bajada.id;
    }

    return (
      <button
        key={viaje.tipo + indice}
        type="button"
        className="fila-salida"
        onClick={() => elegirViaje(viaje)}
      >
        <span
          className="fila-salida__color"
          style={{ backgroundColor: obtenerColorLinea(viaje.tramos[0].linea) }}
        ></span>
        <span className="fila-salida__info">
          <span className="fila-salida__linea">{nombresLineas.join(' + ')}</span>
          <span className="fila-salida__destino">
            {detalle} · caminata {formatearMetros(viaje.caminataTotal)}
          </span>
        </span>
        <span className="fila-salida__tiempo">{viaje.minutos} min</span>
      </button>
    );
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

  
  let claseCard = 'buscador-card buscador-card--columna';
  if (plegado) {
    claseCard = claseCard + ' buscador-card--plegado';
  }

  function abrirAlEscribir(evento) {
    if (evento.target.tagName === 'INPUT') {
      setPlegado(false);
    }
  }

  function dibujarAsa() {
    let etiqueta = 'Ocultar el panel';
    if (plegado) {
      etiqueta = 'Mostrar el panel';
    }
    return (
      <button type="button" className="buscador__plegar" onClick={() => setPlegado(!plegado)} aria-label={etiqueta}>
        <IconoChevron arriba={!plegado} />
      </button>
    );
  }

  if (seccionActiva === 'direccion') {

    if (viajeElegido !== null) {

      let titulo = [];
      for (let i = 0; i < viajeElegido.tramos.length; i++) {
        titulo.push('Línea ' + viajeElegido.tramos[i].linea.nombre);
      }

      let pasos = [];

      for (let i = 0; i < viajeElegido.tramos.length; i++) {
        let tramo = viajeElegido.tramos[i];
        let metros = viajeElegido.caminatas[i];

        let textoCaminata = 'Caminá ' + formatearMetros(metros) + ' hasta la parada ' + nombreParada(tramo.subida) + '.';
        if (i > 0 && metros < 15) {
          textoCaminata = 'Combiná en la misma parada: ' + nombreParada(tramo.subida) + '.';
        }

        pasos.push(
          <div key={'caminar' + i} className="buscador__ayuda">
            {textoCaminata}
          </div>
        );

        pasos.push(
          <div key={'micro' + i} className="fila-salida" style={{ cursor: 'default' }}>
            <span
              className="fila-salida__color"
              style={{ backgroundColor: obtenerColorLinea(tramo.linea) }}
            ></span>
            <span className="fila-salida__info">
              <span className="fila-salida__linea">Línea {tramo.linea.nombre}</span>
              <span className="fila-salida__destino">{tramo.bandera.nombre}</span>
              <span className="fila-salida__destino">Bajá en {nombreParada(tramo.bajada)}</span>
            </span>
            <span className="fila-salida__tiempo">{tramo.cantidadParadas} paradas</span>
          </div>
        );
      }

      let metrosFinales = viajeElegido.caminatas[viajeElegido.caminatas.length - 1];
      pasos.push(
        <div key="final" className="buscador__ayuda">
          Caminá {formatearMetros(metrosFinales)} hasta tu destino.
        </div>
      );

      return (
        <div className="buscador-container">
          <div className={claseCard} onFocusCapture={abrirAlEscribir}>

            <div className="buscador__fijo">
              <div className="cabecera-detalle">
                <button type="button" className="boton-atras" onClick={volverDeViaje}>
                  <IconoFlechaAtras />
                </button>
                <div className="cabecera-detalle__info">
                  <div className="cabecera-detalle__titulo">{titulo.join(' + ')}</div>
                  <div className="cabecera-detalle__subtitulo">
                    Unos {viajeElegido.minutos} min · caminata total {formatearMetros(viajeElegido.caminataTotal)}
                  </div>
                </div>
              </div>

              <div className="buscador__separador"></div>
            </div>

            <div className="buscador__scroll">
              {pasos}
            </div>

            {dibujarAsa()}
          </div>
        </div>
      );
    }

    let estiloOrigen = {};
    let estiloDestino = {};
    if (campoActivo === 'origen') {
      estiloOrigen = { boxShadow: '0 0 0 2px #0d9be0' };
    } else {
      estiloDestino = { boxShadow: '0 0 0 2px #0d9be0' };
    }

    let ayuda = null;
    if (mensaje !== '') {
      ayuda = mensaje;
    } else if (origen === null || destino === null) {
      ayuda = 'También podés seleccionarla desde el mapa';
    }

    let hayResultados = false;
    if (resultados !== null) {
      hayResultados = resultados.directos.length > 0 || resultados.combinaciones.length > 0;
    }

    return (
      <div className="buscador-container">
        <div className={claseCard} onFocusCapture={abrirAlEscribir}>

          <div className="buscador__fijo">
            <div className="buscador__fila">
              <input
                type="text"
                placeholder="Punto de inicio"
                className="buscador__input buscador__input--gris"
                style={estiloOrigen}
                value={textoOrigen}
                onFocus={() => setCampoActivo('origen')}
                onChange={(evento) => cambiarTextoPunto('origen', evento.target.value)}
                onKeyDown={(evento) => {
                  if (evento.key === 'Enter') {
                    buscarPunto('origen', textoOrigen);
                  }
                }}
              />
            </div>

            <div className="buscador__fila">
              <input
                type="text"
                placeholder="Punto de destino"
                className="buscador__input buscador__input--gris"
                style={estiloDestino}
                value={textoDestino}
                onFocus={() => setCampoActivo('destino')}
                onChange={(evento) => cambiarTextoPunto('destino', evento.target.value)}
                onKeyDown={(evento) => {
                  if (evento.key === 'Enter') {
                    buscarPunto('destino', textoDestino);
                  }
                }}
              />
            </div>
          </div>

          <div className="buscador__scroll">
            {ayuda !== null && <div className="buscador__ayuda">{ayuda}</div>}

            {(origen !== null || destino !== null) && (
              <div className="buscador__encabezado">
                <span></span>
                <button type="button" className="buscador__link" onClick={limpiarPuntos}>
                  Limpiar
                </button>
              </div>
            )}

            {resultados !== null && !hayResultados && (
              <div className="buscador__ayuda">
                No se encontraron micros que conecten estos puntos (se buscaron paradas hasta 800 m a pie).
              </div>
            )}

            {resultados !== null && resultados.directos.length > 0 && (
              <>
                <div className="buscador__separador"></div>
                <div className="buscador__encabezado">
                  <span>MICROS DIRECTOS</span>
                </div>
                <div className="lista-lineas">
                  {resultados.directos.map((viaje, indice) => dibujarFilaViaje(viaje, indice))}
                </div>
              </>
            )}

            {resultados !== null && resultados.combinaciones.length > 0 && (
              <>
                <div className="buscador__separador"></div>
                <div className="buscador__encabezado">
                  <span>CON COMBINACIÓN</span>
                </div>
                <div className="lista-lineas">
                  {resultados.combinaciones.map((viaje, indice) => dibujarFilaViaje(viaje, indice))}
                </div>
              </>
            )}
          </div>

          {dibujarAsa()}
        </div>
      </div>
    );
  }

  if (seccionActiva === 'recorrido') {

    let barraLinea = (
      <div className="buscador__fila">
        <input
          type="text"
          placeholder="Buscar línea"
          className="buscador__input buscador__input--gris"
          value={textoLinea}
          onChange={(evento) => escribirLinea(evento.target.value)}
          onFocus={(evento) => evento.target.select()}
        />
      </div>
    );

    let lineaElegida = null;
    for (let i = 0; i < datosParadas.lineas.length; i++) {
      if (datosParadas.lineas[i].abbr === lineaSeleccionada) {
        lineaElegida = datosParadas.lineas[i];
      }
    }

    let escribiendoOtraLinea = textoLinea !== '';
    if (lineaElegida !== null && textoLinea === lineaElegida.nombre) {
      escribiendoOtraLinea = false;
    }

    if (escribiendoOtraLinea) {
      let resultados = buscarLineas(textoLinea, datosParadas.lineas);

      return (
        <div className="buscador-container">
          <div className={claseCard} onFocusCapture={abrirAlEscribir}>

            <div className="buscador__fijo">
              {barraLinea}

              <div className="buscador__separador"></div>
            </div>

            <div className="buscador__scroll">
              <div className="buscador__encabezado">
                <span>RESULTADOS</span>
              </div>

              {resultados.length === 0 && (
                <div className="buscador__ayuda">No se encontraron líneas.</div>
              )}

              {resultados.map((linea) => (
                <button
                  key={linea.abbr}
                  type="button"
                  className="fila-parada"
                  onClick={() => elegirLinea(linea)}
                >
                  <span className="fila-parada__id">Línea {linea.nombre}</span>
                </button>
              ))}
            </div>

            {dibujarAsa()}
          </div>
        </div>
      );
    }

    if (lineaElegida === null) {
      return (
        <div className="buscador-container">
          <div className={claseCard} onFocusCapture={abrirAlEscribir}>

            <div className="buscador__fijo">
              {barraLinea}
            </div>

            <div className="buscador__scroll">
              <div className="buscador__ayuda">
                Escribí el número de una línea para ver sus ramales.
              </div>
            </div>

            {dibujarAsa()}
          </div>
        </div>
      );
    }

    let ramales = obtenerRamales(lineaElegida, datosParadas.banderas);

    return (
      <div className="buscador-container">
        <div className={claseCard} onFocusCapture={abrirAlEscribir}>

          <div className="buscador__fijo">
            {barraLinea}

            <div className="buscador__separador"></div>
          </div>

          <div className="buscador__scroll">
            <div className="buscador__encabezado">
              <span>RAMALES ({ramales.length})</span>
              <span>
                <button type="button" className="buscador__link" onClick={mostrarTodosLosRamales}>
                  Todos
                </button>
                {' · '}
                <button type="button" className="buscador__link" onClick={() => ocultarTodosLosRamales(ramales)}>
                  Ninguno
                </button>
              </span>
            </div>

            {ramales.length === 0 && (
              <div className="buscador__ayuda">Esta línea no tiene recorridos cargados.</div>
            )}

            <div className="lista-lineas">
              {ramales.map((ramal, posicion) => {

                let tildado = ramalesOcultos[ramal.id] !== true;

                let claseFila = 'fila-linea';
                if (tildado) {
                  claseFila = 'fila-linea fila-linea--activa';
                }

                return (
                  <label key={ramal.id} className={claseFila}>
                    <input
                      type="checkbox"
                      checked={tildado}
                      onChange={() => alternarRamal(ramal.id)}
                    />
                    <span
                      className="fila-linea__color"
                      style={{ backgroundColor: colorDeRamal(posicion) }}
                    ></span>
                    <span className="fila-linea__nombre">{ramal.nombre}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {dibujarAsa()}
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
          <div className={claseCard} onFocusCapture={abrirAlEscribir}>

            <div className="buscador__fijo">
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
        </div>
      );
    }

    if (paradaSeleccionada !== null) {
      let salidas = generarSalidas(paradaSeleccionada, datosParadas);

      return (
        <div className="buscador-container">
          <div className={claseCard} onFocusCapture={abrirAlEscribir}>

            <div className="buscador__fijo">
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
                  <IconoCorazon relleno={esFavorito(paradaSeleccionada.id)} color="#0d9be0" />
                </button>
              </div>

              <div className="buscador__separador"></div>
            </div>

            <div className="buscador__scroll">
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

            {dibujarAsa()}
          </div>
        </div>
      );
    }

  
    if (texto !== '') {
      let resultados = buscarParadas(texto, datosParadas.paradas);

      return (
        <div className="buscador-container">
          <div className={claseCard} onFocusCapture={abrirAlEscribir}>

            <div className="buscador__fijo">
              {dibujarBarraBusqueda()}

              <div className="buscador__separador"></div>
            </div>

            <div className="buscador__scroll">
              <div className="buscador__encabezado">
                <span>RESULTADOS</span>
              </div>

              {resultados.length === 0 && (
                <div className="buscador__ayuda">No se encontraron paradas.</div>
              )}

              {resultados.map((parada) => dibujarFilaParada(parada))}
            </div>

            {dibujarAsa()}
          </div>
        </div>
      );
    }

    if (verFavoritos) {
      let paradasFavoritas = obtenerParadasFavoritas(favoritos, datosParadas.paradas);

      return (
        <div className="buscador-container">
          <div className={claseCard} onFocusCapture={abrirAlEscribir}>

            <div className="buscador__fijo">
              {dibujarBarraBusqueda()}

              <div className="buscador__separador"></div>
            </div>

            <div className="buscador__scroll">
              <div className="buscador__encabezado">
                <span>FAVORITOS</span>
              </div>

              {paradasFavoritas.length === 0 && (
                <div className="buscador__ayuda">Todavía no tenés paradas favoritas.</div>
              )}

              {paradasFavoritas.map((parada) => dibujarFilaParada(parada))}
            </div>

            {dibujarAsa()}
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
        <div className={claseCard} onFocusCapture={abrirAlEscribir}>

          <div className="buscador__fijo">
            {dibujarBarraBusqueda()}

            <div className="buscador__separador"></div>
          </div>

          <div className="buscador__scroll">
            <div className="buscador__encabezado">
              <span>MOSTRAR LÍNEAS EN MAPA</span>
              <span>
                <button type="button" className="buscador__link" onClick={mostrarTodasLasLineas}>
                  Todas
                </button>
                {' · '}
                <button type="button" className="buscador__link" onClick={ocultarTodasLasLineas}>
                  Ninguna
                </button>
              </span>
            </div>

            <div className="lista-lineas">
              {datosParadas.lineas.map((linea) => {

                let tildada = lineasVisibles[linea.abbr] === true;

                let claseFila = 'fila-linea';
                if (tildada) {
                  claseFila = 'fila-linea fila-linea--activa';
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

          {dibujarAsa()}
        </div>
      </div>
    );
  }

  return null;
}

export default Buscador;