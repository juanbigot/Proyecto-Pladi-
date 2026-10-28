import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Flag, Clock, MapPin } from 'lucide-react';
import { buscarViajes } from '../buscarViajes.js';
import { ubicarDireccion, direccionDePunto } from '../ubicarDireccion.js';
import { colorDeRamal, parejaDeSentido } from './CapaRecorridos.jsx';

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

const CLAVE_FAVORITOS = 'pladi_favoritos';

function leerFavoritosGuardados() {
  let resultado = [];

  try {
    let texto = localStorage.getItem(CLAVE_FAVORITOS);
    if (texto === null) {
      return resultado;
    }

    let lista = JSON.parse(texto);
    if (!Array.isArray(lista)) {
      return resultado;
    }

    for (let i = 0; i < lista.length; i++) {
      if (typeof lista[i] === 'string') {
        resultado.push(lista[i]);
      }
    }
  } catch (error) {
    return [];
  }

  return resultado;
}

function guardarFavoritos(favoritos) {
  try {
    localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify(favoritos));
  } catch (error) {
    return;
  }
}

const CLAVE_RECIENTES = 'pladi_recientes';
const MAX_RECIENTES = 4;

function leerRecientesGuardados() {
  let resultado = [];

  try {
    let texto = localStorage.getItem(CLAVE_RECIENTES);
    if (texto === null) {
      return resultado;
    }

    let lista = JSON.parse(texto);
    if (!Array.isArray(lista)) {
      return resultado;
    }

    for (let i = 0; i < lista.length; i++) {
      let item = lista[i];
      let valido =
        item &&
        typeof item.texto === 'string' &&
        Array.isArray(item.punto) &&
        item.punto.length === 2 &&
        Number.isFinite(item.punto[0]) &&
        Number.isFinite(item.punto[1]);

      if (valido && resultado.length < MAX_RECIENTES) {
        resultado.push({ texto: item.texto, punto: [item.punto[0], item.punto[1]] });
      }
    }
  } catch (error) {
    return [];
  }

  return resultado;
}

function guardarRecientes(recientes) {
  try {
    localStorage.setItem(CLAVE_RECIENTES, JSON.stringify(recientes));
  } catch (error) {
    return;
  }
}

function agregarReciente(recientes, texto, punto) {
  let nuevos = [{ texto: texto, punto: punto }];

  for (let i = 0; i < recientes.length; i++) {
    let repetido = recientes[i].texto.toLowerCase() === texto.toLowerCase();
    if (!repetido && nuevos.length < MAX_RECIENTES) {
      nuevos.push(recientes[i]);
    }
  }

  return nuevos;
}

function ponerMayuscula(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
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

const OPCIONES_UBICACION_ACTUAL = { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 };

function mensajeDeErrorDeUbicacion(error) {
  if (error && error.code === 1) {
    return 'No diste permiso para usar tu ubicación. Podés habilitarlo en los ajustes del navegador.';
  }
  if (error && error.code === 3) {
    return 'Tardó demasiado en obtener tu ubicación. Probá de nuevo.';
  }
  return 'No se pudo obtener tu ubicación.';
}

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

function useMedia(consulta) {
  const [coincide, setCoincide] = useState(() => window.matchMedia(consulta).matches);

  useEffect(() => {
    let lista = window.matchMedia(consulta);

    function alCambiar() {
      setCoincide(lista.matches);
    }

    alCambiar();
    lista.addEventListener('change', alCambiar);
    return () => {
      lista.removeEventListener('change', alCambiar);
    };
  }, [consulta]);

  return coincide;
}

function Buscador({ seccionActiva, datosParadas, lineaSeleccionada, sentidosLinea, sentidoRecorrido, onSeleccionarLinea, mapa, onMostrarBandera, paradaSeleccionada, onElegirParada, lineasVisibles, onCambiarLineasVisibles, ramalesOcultos, onCambiarRamalesOcultos, origen, destino, viajeElegido, onCambiarOrigen, onCambiarDestino, onElegirViaje }) {

  const [texto, setTexto] = useState('');
  const [verFavoritos, setVerFavoritos] = useState(false);
  const [favoritos, setFavoritos] = useState(leerFavoritosGuardados);
  const [salidaSeleccionada, setSalidaSeleccionada] = useState(null);
  const [sentido, setSentido] = useState('ida');
  const [banderaVuelta, setBanderaVuelta] = useState(null);
  const [textoLinea, setTextoLinea] = useState('');
  const [textoOrigen, setTextoOrigen] = useState('');
  const [textoDestino, setTextoDestino] = useState('');
  const [campoActivo, setCampoActivo] = useState('origen');
  const [mensaje, setMensaje] = useState('');
  const [recientes, setRecientes] = useState(leerRecientesGuardados);
  const [desplegable, setDesplegable] = useState(null);
  const [camposConError, setCamposConError] = useState({ origen: false, destino: false });
  const [seleccionandoEnMapa, setSeleccionandoEnMapa] = useState(null);
  const esCompu = useMedia('(min-width: 1000px)');
  const esTablet = useMedia('(min-width: 560px) and (max-width: 999px)');
  const esTabletHorizontal = useMedia('(min-width: 560px) and (max-width: 999px) and (orientation: landscape)');
  const [seleccionCentral, setSeleccionCentral] = useState(null);
  const [centro, setCentro] = useState(null);
  const [alturaCentro, setAlturaCentro] = useState(null);
  const tarjetaRef = useRef(null);
  const ultimoPunto = useRef({ origen: null, destino: null });
  const pidiendoUbicacion = useRef(false);
  const pidioAlEntrar = useRef(false);
  const origenActual = useRef(origen);
  const destinoActual = useRef(destino);
  const recientesActuales = useRef(recientes);
  const textoOrigenActual = useRef('');
  origenActual.current = origen;
  destinoActual.current = destino;
  recientesActuales.current = recientes;
  textoOrigenActual.current = textoOrigen;
  const [plegado, setPlegado] = useState(false);

  useEffect(() => {
    setPlegado(false);
  }, [seccionActiva, paradaSeleccionada, viajeElegido, lineaSeleccionada, verFavoritos]);

  useEffect(() => {
    if (pidioAlEntrar.current) {
      return;
    }
    pidioAlEntrar.current = true;
    pedirUbicacionActual(false, 'origen', false);
  }, []);

  useEffect(() => {
    if (origen !== null && destino !== null) {
      setPlegado(false);
    }
  }, [origen, destino]);

  useEffect(() => {
    setDesplegable(null);
    setSeleccionCentral(null);
    cancelarSeleccionEnMapa();
  }, [seccionActiva]);

  useEffect(() => {
    if (desplegable === null) {
      return;
    }

    function alTocarAfuera(evento) {
      if (tarjetaRef.current && !tarjetaRef.current.contains(evento.target)) {
        setDesplegable(null);
      }
    }

    document.addEventListener('pointerdown', alTocarAfuera);
    return () => {
      document.removeEventListener('pointerdown', alTocarAfuera);
    };
  }, [desplegable]);

  const resultados = useMemo(() => {
    if (origen === null || destino === null) {
      return null;
    }
    return buscarViajes(origen, destino, datosParadas);
  }, [origen, destino, datosParadas]);

  useEffect(() => {
    if (mapa === null || seccionActiva !== 'direccion' || seleccionandoEnMapa === null) {
      return;
    }

    function alHacerClickEnElMapa(evento) {
      let punto = [evento.latlng.lat, evento.latlng.lng];

      if (seleccionandoEnMapa === 'origen') {
        onCambiarOrigen(punto);
        escribirDireccion('origen', punto, true);
        setCampoActivo('destino');
      } else {
        onCambiarDestino(punto);
        escribirDireccion('destino', punto, true);
      }
      onElegirViaje(null);
      setMensaje('');
      setSeleccionandoEnMapa(null);
    }

    mapa.on('click', alHacerClickEnElMapa);

    return () => {
      mapa.off('click', alHacerClickEnElMapa);
    };
  }, [mapa, seccionActiva, seleccionandoEnMapa]);

  useEffect(() => {
    if (seleccionCentral === null || mapa === null) {
      setCentro(null);
      setAlturaCentro(null);
      return;
    }

    let cuadro = null;
    let temporizador = null;
    let version = 0;

    function medirCentro() {
      let caja = mapa.getContainer().getBoundingClientRect();
      let abajo = caja.height;

      let barra = document.querySelector('.nav');
      if (barra) {
        let r = barra.getBoundingClientRect();
        if (r.height > 0 && r.top - caja.top > caja.height / 2) {
          abajo = r.top - caja.top;
        }
      }
      return { x: caja.width / 2, y: abajo / 2 };
    }

    function actualizar(terminoDeMover) {
      let zona = medirCentro();
      setAlturaCentro(zona.y);

      let latlng = mapa.containerPointToLatLng([zona.x, zona.y]);
      let punto = [latlng.lat, latlng.lng];

      version = version + 1;
      let miVersion = version;
      clearTimeout(temporizador);

      let texto = direccionDePunto(punto, datosParadas);
      if (texto !== null) {
        setCentro({ punto: punto, texto: texto, listo: true, coordenadas: false });
        return;
      }

      let coordenadas = punto[0].toFixed(5) + ', ' + punto[1].toFixed(5);
      setCentro({ punto: punto, texto: coordenadas, listo: false, coordenadas: true });

      if (!terminoDeMover) {
        return;
      }

      temporizador = setTimeout(async () => {
        let nombre = null;
        try {
          nombre = await buscarNombreDePunto(punto);
        } catch (error) {
          nombre = null;
        }

        if (miVersion !== version) {
          return;
        }

        if (nombre !== null) {
          setCentro({ punto: punto, texto: nombre, listo: true, coordenadas: false });
        } else {
          setCentro({ punto: punto, texto: coordenadas, listo: true, coordenadas: true });
        }
      }, 300);
    }

    function alMover() {
      if (cuadro === null) {
        cuadro = requestAnimationFrame(() => {
          cuadro = null;
          actualizar(false);
        });
      }
    }

    function alTerminarDeMover() {
      if (cuadro !== null) {
        cancelAnimationFrame(cuadro);
        cuadro = null;
      }
      actualizar(true);
    }

    actualizar(true);

    mapa.on('move', alMover);
    mapa.on('moveend', alTerminarDeMover);
    window.addEventListener('resize', alTerminarDeMover);

    return () => {
      mapa.off('move', alMover);
      mapa.off('moveend', alTerminarDeMover);
      window.removeEventListener('resize', alTerminarDeMover);
      if (cuadro !== null) {
        cancelAnimationFrame(cuadro);
      }
      clearTimeout(temporizador);
      version = version + 1;
    };
  }, [mapa, seleccionCentral]);

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
    let nuevos = [];

    if (esFavorito(idParada)) {
      for (let i = 0; i < favoritos.length; i++) {
        if (favoritos[i] !== idParada) {
          nuevos.push(favoritos[i]);
        }
      }
    } else {
      nuevos = [...favoritos, idParada];
    }

    setFavoritos(nuevos);
    guardarFavoritos(nuevos);
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
    setBanderaVuelta(parejaDeSentido(datosParadas, salida.bandera));
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

  function mostrarTodosLosRamales(ramales) {
    let nuevos = { ...ramalesOcultos };
    for (let i = 0; i < ramales.length; i++) {
      delete nuevos[ramales[i].id];
    }
    onCambiarRamalesOcultos(nuevos);
  }

  function ocultarTodosLosRamales(ramales) {
    let nuevos = { ...ramalesOcultos };
    for (let i = 0; i < ramales.length; i++) {
      nuevos[ramales[i].id] = true;
    }
    onCambiarRamalesOcultos(nuevos);
  }

  function marcarError(campo, hayError) {
    setCamposConError((actual) => {
      if (actual[campo] === hayError) {
        return actual;
      }
      return { ...actual, [campo]: hayError };
    });
  }

  function ponerTexto(campo, texto) {
    marcarError(campo, false);
    if (campo === 'origen') {
      setTextoOrigen(texto);
    } else {
      setTextoDestino(texto);
    }
  }

  async function escribirDireccion(campo, punto, guardar) {
    ultimoPunto.current[campo] = punto;

    let texto = direccionDePunto(punto, datosParadas);
    if (texto !== null) {
      ponerTexto(campo, texto);
      if (guardar) {
        guardarReciente(texto, punto);
      }
      return;
    }

    ponerTexto(campo, punto[0].toFixed(5) + ', ' + punto[1].toFixed(5));

    try {
      let nombre = await buscarNombreDePunto(punto);

      if (nombre !== null && ultimoPunto.current[campo] === punto) {
        ponerTexto(campo, nombre);
        if (guardar) {
          guardarReciente(nombre, punto);
        }
      }
    } catch (error) {
    }
  }

  async function buscarPunto(campo, texto) {
    if (texto.trim() === '') {
      return;
    }

    setDesplegable(null);

    let punto = null;

    let local = ubicarDireccion(texto, datosParadas);

    if (local !== null && local.error) {
      setMensaje(MENSAJE_ERROR_UBICACION);
      marcarError(campo, true);
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
        marcarError(campo, true);
        return;
      }

      if (punto === null) {
        setMensaje(MENSAJE_ERROR_UBICACION);
        marcarError(campo, true);
        return;
      }
    }

    let textoReciente = texto.trim();
    if (local !== null) {
      textoReciente = ponerMayuscula(local.descripcion);
    }

    aplicarPunto(campo, punto, null, true);
    guardarReciente(textoReciente, punto);
  }

  function guardarReciente(texto, punto) {
    let nuevos = agregarReciente(recientesActuales.current, texto, punto);
    recientesActuales.current = nuevos;
    setRecientes(nuevos);
    guardarRecientes(nuevos);
  }

  function aplicarPunto(campo, punto, textoCampo, volar) {
    ultimoPunto.current[campo] = punto;
    setMensaje('');
    setSeleccionandoEnMapa(null);
    marcarError(campo, false);

    let otroPunto = null;
    if (campo === 'origen') {
      onCambiarOrigen(punto);
      otroPunto = destinoActual.current;
      setCampoActivo('destino');
    } else {
      onCambiarDestino(punto);
      otroPunto = origenActual.current;
    }
    onElegirViaje(null);

    if (textoCampo !== null) {
      ponerTexto(campo, textoCampo);
    }

    if (volar && mapa) {
      if (otroPunto !== null) {
        mapa.flyToBounds([punto, otroPunto], { padding: [60, 60] });
      } else {
        mapa.flyTo(punto, 16);
      }
    }
  }

  function pedirUbicacionActual(avisar, campo, forzar) {
    if (!navigator.geolocation) {
      if (avisar) {
        setMensaje('Este navegador no permite obtener tu ubicación.');
      }
      return;
    }

    if (!forzar && pidiendoUbicacion.current) {
      return;
    }
    if (!forzar) {
      pidiendoUbicacion.current = true;
    }

    if (avisar) {
      setMensaje('Buscando tu ubicación...');
    }

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        pidiendoUbicacion.current = false;

        if (!forzar && (origenActual.current !== null || textoOrigenActual.current !== '')) {
          if (avisar) {
            setMensaje('');
          }
          return;
        }

        let punto = [posicion.coords.latitude, posicion.coords.longitude];

        aplicarPunto(campo, punto, null, avisar);
        escribirDireccion(campo, punto, false);
      },
      (error) => {
        pidiendoUbicacion.current = false;

        if (avisar) {
          setMensaje(mensajeDeErrorDeUbicacion(error));
        }
      },
      OPCIONES_UBICACION_ACTUAL
    );
  }

  function cancelarSeleccionEnMapa() {
    setSeleccionandoEnMapa(null);
  }

  function abrirDesplegable(campo) {
    setCampoActivo(campo);
    setDesplegable(campo);

    if (esCompu) {
      setSeleccionandoEnMapa(campo);
    } else {
      setSeleccionandoEnMapa(null);
    }
  }

  function elegirUbicacionActual(campo) {
    setDesplegable(null);
    setSeleccionandoEnMapa(null);
    pedirUbicacionActual(true, campo, true);
  }

  function elegirReciente(campo, reciente) {
    setDesplegable(null);
    aplicarPunto(campo, reciente.punto, reciente.texto, true);
    guardarReciente(reciente.texto, reciente.punto);
  }

  function seleccionarEnElMapa(campo) {
    setCampoActivo(campo);
    setDesplegable(null);

    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }

    setSeleccionCentral(campo);
  }

  function establecerPuntoCentral() {
    if (seleccionCentral === null || centro === null || !centro.listo) {
      return;
    }

    aplicarPunto(seleccionCentral, centro.punto, centro.texto, false);

    if (!centro.coordenadas) {
      guardarReciente(centro.texto, centro.punto);
    }
    setSeleccionCentral(null);
  }

  function cancelarSeleccionCentral() {
    setSeleccionCentral(null);
  }

  function cambiarTextoPunto(campo, valor) {
    ultimoPunto.current[campo] = null;
    marcarError(campo, false);

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
    setDesplegable(null);
    setSeleccionandoEnMapa(null);
    setCamposConError({ origen: false, destino: false });
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

  function dibujarDesplegable(campo) {
    let mostrarUbicacionActual = !esTablet;
    let mostrarRecientes = !esTabletHorizontal;
    let mostrarSeleccionEnMapa = !esCompu;

    return (
      <div className="desplegable">
        {esCompu && <div className="buscador__ayuda">También podés seleccionar desde el mapa</div>}

        {mostrarUbicacionActual && (
          <>
            <button type="button" className="desplegable__opcion" onClick={() => elegirUbicacionActual(campo)}>
              <span className="desplegable__icono">
                <span className="desplegable__circulo"></span>
              </span>
              <span className="desplegable__texto">Ubicación actual</span>
            </button>

            <div className="buscador__separador"></div>
          </>
        )}

        {mostrarRecientes && (
          <>
            <div className="desplegable__titulo">Recientes</div>

            {recientes.length === 0 && (
              <div className="desplegable__vacio">Todavía no hay ubicaciones recientes.</div>
            )}

            {recientes.map((reciente) => (
              <button
                key={reciente.texto}
                type="button"
                className="desplegable__opcion"
                onClick={() => elegirReciente(campo, reciente)}
              >
                <span className="desplegable__icono">
                  <Clock size={20} />
                </span>
                <span className="desplegable__texto">{reciente.texto}</span>
              </button>
            ))}
          </>
        )}

        {mostrarRecientes && mostrarSeleccionEnMapa && <div className="buscador__separador"></div>}

        {mostrarSeleccionEnMapa && (
          <button
            type="button"
            className="desplegable__opcion desplegable__opcion--fuerte"
            onClick={() => seleccionarEnElMapa(campo)}
          >
            <span className="desplegable__icono">
              <MapPin size={22} />
            </span>
            <span className="desplegable__texto">Seleccionar en el mapa</span>
          </button>
        )}
      </div>
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

    if (seleccionCentral !== null) {
      let textoCentro = 'Seleccionar ubicación';
      let puedeEstablecer = false;
      if (centro !== null) {
        if (centro.texto !== '') {
          textoCentro = centro.texto;
        }
        puedeEstablecer = centro.listo;
      }

      let claseEstablecer = 'seleccion__establecer';
      if (puedeEstablecer) {
        claseEstablecer = 'seleccion__establecer seleccion__establecer--activo';
      }

      let punto = <span className="seleccion__circulo"></span>;
      if (seleccionCentral === 'destino') {
        punto = (
          <svg
            className="seleccion__bandera"
            width="34"
            height="34"
            viewBox="0 0 24 24"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <g fill="#ffffff" stroke="#ffffff" strokeWidth="5">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </g>
            <g fill="#0d9be0" stroke="#0d9be0" strokeWidth="2">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </g>
          </svg>
        );
      }

      return (
        <>
          <div className="buscador-container">
            <div className="buscador-card buscador-card--seleccion">
              <button
                type="button"
                className="boton-atras seleccion__cancelar"
                onClick={cancelarSeleccionCentral}
                aria-label="Cancelar"
              >
                <IconoFlechaAtras />
              </button>
              <div className="seleccion__texto">{textoCentro}</div>
            </div>
          </div>

          {alturaCentro !== null && (
            <div className="seleccion__pin" style={{ top: alturaCentro + 'px' }}>
              {punto}
            </div>
          )}

          <button
            type="button"
            className={claseEstablecer}
            disabled={!puedeEstablecer}
            onClick={establecerPuntoCentral}
          >
            Establecer
          </button>
        </>
      );
    }

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

    let claseOrigen = 'buscador__input buscador__input--gris buscador__input--origen';
    let claseDestino = 'buscador__input buscador__input--gris buscador__input--destino';
    if (campoActivo === 'origen') {
      claseOrigen = claseOrigen + ' buscador__input--activo';
    } else {
      claseDestino = claseDestino + ' buscador__input--activo';
    }

    if (camposConError.origen) {
      claseOrigen = claseOrigen + ' buscador__input--error';
    }
    if (camposConError.destino) {
      claseDestino = claseDestino + ' buscador__input--error';
    }

    let ayuda = null;
    if (mensaje !== '') {
      ayuda = mensaje;
    } else if (origen === null || destino === null) {
      ayuda = 'También podés tocar un campo y elegir "Seleccionar en el mapa"';
      if (esCompu) {
        ayuda = 'También podés tocar un campo y hacer clic en el mapa';
      }
    }

    let claseTarjeta = claseCard;
    if (desplegable !== null) {
      claseTarjeta = claseCard + ' buscador-card--desplegable';
    }

    let claseCirculoInicio = 'buscador__punto buscador__punto--vacio';
    let colorBandera = '#9ca3af';
    if (origen !== null) {
      claseCirculoInicio = 'buscador__punto buscador__punto--lleno';
    }
    if (destino !== null) {
      colorBandera = '#0d9be0';
    }

    let hayResultados = false;
    if (resultados !== null) {
      hayResultados = resultados.directos.length > 0 || resultados.combinaciones.length > 0;
    }

    return (
      <div className="buscador-container">
        <div ref={tarjetaRef} className={claseTarjeta} onFocusCapture={abrirAlEscribir}>

          <div className="buscador__fijo">
            <div className="buscador__fila">
              <span className="buscador__marca">
                <span className={claseCirculoInicio}></span>
              </span>
              <input
                type="text"
                placeholder="Punto de inicio"
                className={claseOrigen}
                value={textoOrigen}
                onFocus={() => abrirDesplegable('origen')}
                onClick={() => abrirDesplegable('origen')}
                onChange={(evento) => cambiarTextoPunto('origen', evento.target.value)}
                onKeyDown={(evento) => {
                  if (evento.key === 'Enter') {
                    buscarPunto('origen', textoOrigen);
                  }
                  if (evento.key === 'Escape') {
                    setDesplegable(null);
                    setSeleccionandoEnMapa(null);
                  }
                }}
              />
            </div>

            <div className="buscador__fila">
              <span className="buscador__marca">
                <Flag size={18} color={colorBandera} fill={colorBandera} />
              </span>
              <input
                type="text"
                placeholder="Punto de destino"
                className={claseDestino}
                value={textoDestino}
                onFocus={() => abrirDesplegable('destino')}
                onClick={() => abrirDesplegable('destino')}
                onChange={(evento) => cambiarTextoPunto('destino', evento.target.value)}
                onKeyDown={(evento) => {
                  if (evento.key === 'Enter') {
                    buscarPunto('destino', textoDestino);
                  }
                  if (evento.key === 'Escape') {
                    setDesplegable(null);
                    setSeleccionandoEnMapa(null);
                  }
                }}
              />
            </div>
          </div>

          <div className="buscador__scroll">
            {desplegable !== null && dibujarDesplegable(desplegable)}

            {desplegable === null && (
            <>
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

    let ramales = sentidosLinea[sentidoRecorrido];

    let cantidadSeleccionados = 0;
    for (let i = 0; i < ramales.length; i++) {
      if (ramalesOcultos[ramales[i].id] !== true) {
        cantidadSeleccionados = cantidadSeleccionados + 1;
      }
    }

    return (
      <div className="buscador-container">
        <div className={claseCard} onFocusCapture={abrirAlEscribir}>

          <div className="buscador__fijo">
            {barraLinea}

            <div className="buscador__separador"></div>

            <div className="buscador__encabezado">
              <span>RAMALES ({cantidadSeleccionados})</span>
              <span>
                <button type="button" className="buscador__link" onClick={() => mostrarTodosLosRamales(ramales)}>
                  Todos
                </button>
                {' · '}
                <button type="button" className="buscador__link" onClick={() => ocultarTodosLosRamales(ramales)}>
                  Ninguno
                </button>
              </span>
            </div>
          </div>

          <div className="buscador__scroll">
            {sentidosLinea.ida.length + sentidosLinea.vuelta.length === 0 && (
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
          </div>

          <div className="buscador__scroll">
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