import { useState, useMemo, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker } from 'react-leaflet';
import Navegacion from './componentes/Navegacion.jsx';
import Buscador from './componentes/Buscador.jsx';
import MarkersVisibles from './componentes/MarkersVisibles.jsx';
import CapaRecorridos, { separarPorSentido } from './componentes/CapaRecorridos.jsx';
import CapaViaje from './componentes/CapaViaje.jsx';
import AvisoZoom from './componentes/AvisoZoom.jsx';
import PantallaCarga from './componentes/PantallaCarga.jsx';
import './App.css';

function unirRamales(base, agregados) {
  let idsExistentes = new Set();
  for (let i = 0; i < base.banderas.length; i++) {
    idsExistentes.add(base.banderas[i].id);
  }

  let banderas = [...base.banderas];
  for (let i = 0; i < agregados.length; i++) {
    if (!idsExistentes.has(agregados[i].id)) {
      banderas.push(agregados[i]);
    }
  }

  return { ...base, banderas: banderas };
}

const centroLaPlata = [-34.9214, -57.9544];

const LIMITES_PARTIDO = [[-35.2456, -58.2986], [-34.825, -57.7427]];

const ZOOM_PARADAS = 16;

const ZOOM_RECORRIDO = 13;

const ZOOM_INICIAL = 15;

const ESPERA_MAXIMA_TILES = 8000;

function seccionInicial() {
  if (window.matchMedia('(min-width: 1000px)').matches) {
    return 'direccion';
  }
  return 'paradas';
}

const ESTILO_MI_UBICACION = {
  color: '#ffffff',
  weight: 3,
  fillColor: '#16a34a',
  fillOpacity: 1,
  interactive: false,
};

const OPCIONES_MI_UBICACION = { enableHighAccuracy: false, maximumAge: 30000, timeout: 20000 };

function crearLineasVisibles(lineas) {
  let resultado = {};
  for (let i = 0; i < lineas.length; i++) {
    resultado[lineas[i].abbr] = true;
  }
  return resultado;
}

function metrosEntre(a, b) {
  let dy = (a[0] - b[0]) * 111320;
  let dx = (a[1] - b[1]) * 111320 * Math.cos((a[0] * Math.PI) / 180);
  return Math.sqrt(dx * dx + dy * dy);
}

function AppMapa({ datosParadas, onMapaListo }) {

  const [seccionActiva, setSeccionActiva] = useState(seccionInicial);

  const [zoomInicial] = useState(() => (seccionActiva === 'paradas' ? ZOOM_PARADAS : ZOOM_INICIAL));
  const [lineaSeleccionada, setLineaSeleccionada] = useState(null);
  const [ramalesOcultos, setRamalesOcultos] = useState({});
  const [sentidoRecorrido, setSentidoRecorrido] = useState('ida');
  const [origen, setOrigen] = useState(null);
  const [destino, setDestino] = useState(null);
  const [viajeElegido, setViajeElegido] = useState(null);
  const [mapa, setMapa] = useState(null);
  const [paradaSeleccionada, setParadaSeleccionada] = useState(null);
  const [banderaMostrada, setBanderaMostrada] = useState(null);
  const [lineasVisibles, setLineasVisibles] = useState(crearLineasVisibles(datosParadas.lineas));
  const [miUbicacion, setMiUbicacion] = useState(null);
  const [seguirUbicacion, setSeguirUbicacion] = useState(false);

  
  useEffect(() => {
    if (!navigator.geolocation || !navigator.permissions || !navigator.permissions.query) {
      return;
    }

    let permiso = null;
    let vivo = true;

    function alCambiarPermiso() {
      setSeguirUbicacion(permiso.state === 'granted');
    }

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((resultado) => {
        if (!vivo) {
          return;
        }
        permiso = resultado;
        permiso.onchange = alCambiarPermiso;
        alCambiarPermiso();
      })
      .catch(() => {});

    return () => {
      vivo = false;
      if (permiso !== null) {
        permiso.onchange = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!seguirUbicacion || !navigator.geolocation) {
      setMiUbicacion(null);
      return;
    }

    let idSeguimiento = null;
    let ultimoPunto = null;
    let ultimoInstante = 0;

    function alRecibirUbicacion(posicion) {
      let punto = [posicion.coords.latitude, posicion.coords.longitude];
      let ahora = Date.now();

      if (ultimoPunto !== null && metrosEntre(punto, ultimoPunto) < 10 && ahora - ultimoInstante < 5000) {
        return;
      }

      ultimoPunto = punto;
      ultimoInstante = ahora;
      setMiUbicacion(punto);
    }

    function alFallarUbicacion(error) {
      if (error && error.code === 1) {
        setSeguirUbicacion(false);
      }
    }

    idSeguimiento = navigator.geolocation.watchPosition(
      alRecibirUbicacion,
      alFallarUbicacion,
      OPCIONES_MI_UBICACION
    );

    return () => {
      navigator.geolocation.clearWatch(idSeguimiento);
    };
  }, [seguirUbicacion]);

  const eventosTiles = useMemo(() => ({ load: onMapaListo }), [onMapaListo]);

  
  useEffect(() => {
    if (mapa === null) {
      return;
    }

    function ajustarZoomMinimo() {
      mapa.setMinZoom(0);
      let zoomMinimo = Math.ceil(mapa.getBoundsZoom(LIMITES_PARTIDO, true));
      if (!isFinite(zoomMinimo) || zoomMinimo < 0) {
        zoomMinimo = 0;
      }
      mapa.setMinZoom(zoomMinimo);
    }

    ajustarZoomMinimo();
    mapa.on('resize', ajustarZoomMinimo);

    return () => {
      mapa.off('resize', ajustarZoomMinimo);
    };
  }, [mapa]);

  useEffect(() => {
    let temporizador = setTimeout(onMapaListo, ESPERA_MAXIMA_TILES);
    return () => clearTimeout(temporizador);
  }, []);

  useEffect(() => {
    if (mapa === null) {
      return;
    }

    if (seccionActiva === 'paradas' && banderaMostrada === null && mapa.getZoom() < ZOOM_PARADAS) {
      mapa.setZoom(ZOOM_PARADAS);
    }

    if (seccionActiva === 'recorrido' && mapa.getZoom() > ZOOM_RECORRIDO) {
      mapa.setZoom(ZOOM_RECORRIDO);
    }
  }, [seccionActiva]);

  function elegirLinea(abbr) {
    setLineaSeleccionada(abbr);
    setRamalesOcultos({});
    setSentidoRecorrido('ida');
  }

  const sentidosLinea = useMemo(() => {
    return separarPorSentido(datosParadas, lineaSeleccionada);
  }, [lineaSeleccionada]);

  function cambiarSentido(nuevoSentido) {
    if (nuevoSentido === sentidoRecorrido) {
      return;
    }

    let nuevos = { ...ramalesOcultos };
    let destino = sentidosLinea[nuevoSentido];

    for (let i = 0; i < destino.length; i++) {
      let pareja = sentidosLinea.parejas.get(destino[i].id);
      if (!pareja) {
        continue;
      }
      if (ramalesOcultos[pareja.id] === true) {
        nuevos[destino[i].id] = true;
      } else {
        delete nuevos[destino[i].id];
      }
    }

    setRamalesOcultos(nuevos);
    setSentidoRecorrido(nuevoSentido);
  }

  const mostrarBotonSentido =
    seccionActiva === 'recorrido' && sentidosLinea.ida.length + sentidosLinea.vuelta.length > 0;

  const paradasFiltradas = useMemo(() => {

    let codigosTildados = [];
    for (let i = 0; i < datosParadas.lineas.length; i++) {
      let linea = datosParadas.lineas[i];
      if (lineasVisibles[linea.abbr] === true) {
        for (let j = 0; j < linea.codigos.length; j++) {
          codigosTildados.push(linea.codigos[j]);
        }
      }
    }

    let resultado = [];
    for (let i = 0; i < datosParadas.paradas.length; i++) {
      let parada = datosParadas.paradas[i];
      for (let j = 0; j < parada.lineas.length; j++) {
        if (codigosTildados.includes(parada.lineas[j])) {
          resultado.push(parada);
          break;
        }
      }
    }
    return resultado;

  }, [lineasVisibles]);

  const paradasEnMapa = useMemo(() => {
    if (paradaSeleccionada === null || paradasFiltradas.includes(paradaSeleccionada)) {
      return paradasFiltradas;
    }
    return [...paradasFiltradas, paradaSeleccionada];
  }, [paradasFiltradas, paradaSeleccionada]);

  return (
    <div className={mostrarBotonSentido ? 'app-raiz app-raiz--con-sentido' : 'app-raiz'}>

      <MapContainer
        ref={setMapa}
        center={centroLaPlata}
        zoom={zoomInicial}
        zoomControl={false}
        maxBounds={LIMITES_PARTIDO}
        maxBoundsViscosity={1.0}
        style={{ height: '100%', width: '100%' }}
      >

        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          referrerPolicy="strict-origin-when-cross-origin"
          eventHandlers={eventosTiles}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {seccionActiva === 'paradas' && banderaMostrada === null && (
          <MarkersVisibles paradas={paradasEnMapa} onElegirParada={setParadaSeleccionada} />
        )}

        {seccionActiva === 'paradas' && banderaMostrada !== null && (
          <Polyline positions={banderaMostrada.recorrido} pathOptions={{ color: '#0d9be0', weight: 4 }} />
        )}

        {seccionActiva === 'direccion' && (
          <CapaViaje origen={origen} destino={destino} viaje={viajeElegido} />
        )}

        {seccionActiva === 'recorrido' && (
          <CapaRecorridos
            ramales={sentidosLinea[sentidoRecorrido]}
            ramalesOcultos={ramalesOcultos}
            colores={sentidosLinea.colores}
          />
        )}

        {miUbicacion !== null && (
          <CircleMarker center={miUbicacion} radius={8} pathOptions={ESTILO_MI_UBICACION} />
        )}

      </MapContainer>

      <AvisoZoom
        mapa={mapa}
        visible={seccionActiva === 'paradas' && banderaMostrada === null}
        zoomDestino={ZOOM_PARADAS}
      />

      <Buscador
        seccionActiva={seccionActiva}
        datosParadas={datosParadas}
        lineaSeleccionada={lineaSeleccionada}
        sentidosLinea={sentidosLinea}
        sentidoRecorrido={sentidoRecorrido}
        onSeleccionarLinea={elegirLinea}
        ramalesOcultos={ramalesOcultos}
        onCambiarRamalesOcultos={setRamalesOcultos}
        mapa={mapa}
        paradaSeleccionada={paradaSeleccionada}
        onElegirParada={setParadaSeleccionada}
        onMostrarBandera={setBanderaMostrada}
        lineasVisibles={lineasVisibles}
        onCambiarLineasVisibles={setLineasVisibles}
        origen={origen}
        destino={destino}
        viajeElegido={viajeElegido}
        onCambiarOrigen={setOrigen}
        onCambiarDestino={setDestino}
        onElegirViaje={setViajeElegido}
        onUbicacionConcedida={() => setSeguirUbicacion(true)}
      />

      {mostrarBotonSentido && (
        <div className="sentido-flotante">
          <div className="toggle-sentido">
            <button
              type="button"
              className={sentidoRecorrido === 'ida' ? 'boton-sentido boton-sentido--activo' : 'boton-sentido'}
              onClick={() => cambiarSentido('ida')}
            >
              Ida
            </button>
            <button
              type="button"
              className={sentidoRecorrido === 'vuelta' ? 'boton-sentido boton-sentido--activo' : 'boton-sentido'}
              onClick={() => cambiarSentido('vuelta')}
              disabled={sentidosLinea.vuelta.length === 0}
            >
              Vuelta
            </button>
          </div>
        </div>
      )}

      <Navegacion
        seccionActiva={seccionActiva}
        onCambiarSeccion={setSeccionActiva}
      />

    </div>
  );
}

function App() {

  const [datosParadas, setDatosParadas] = useState(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [mapaListo, setMapaListo] = useState(false);

  useEffect(() => {
    let vivo = true;

    Promise.all([import('./ubicacionParadas.json'), import('./ramalesAgregados.json')])
      .then((modulos) => {
        if (vivo) {
          setDatosParadas(unirRamales(modulos[0].default, modulos[1].default));
        }
      })
      .catch(() => {
        if (vivo) {
          setErrorCarga(true);
        }
      });

    return () => {
      vivo = false;
    };
  }, []);

  const avisarMapaListo = useCallback(() => setMapaListo(true), []);

  return (
    <>
      {datosParadas !== null && (
        <AppMapa datosParadas={datosParadas} onMapaListo={avisarMapaListo} />
      )}
      <PantallaCarga visible={datosParadas === null || !mapaListo} error={errorCarga} />
    </>
  );
}

export default App;
