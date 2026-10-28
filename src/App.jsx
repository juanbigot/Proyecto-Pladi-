import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker } from 'react-leaflet';
import Navegacion from './componentes/Navegacion.jsx';
import Buscador from './componentes/Buscador.jsx';
import MarkersVisibles from './componentes/MarkersVisibles.jsx';
import CapaRecorridos, { separarPorSentido } from './componentes/CapaRecorridos.jsx';
import CapaViaje from './componentes/CapaViaje.jsx';
import datosParadas from './ubicacionParadas.json';
import './App.css';

const centroLaPlata = [-34.9214, -57.9544];

const ZOOM_PARADAS = 16;

const ZOOM_RECORRIDO = 13;

const ZOOM_INICIAL = 15;

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

const OPCIONES_MI_UBICACION = { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 };

function crearLineasVisibles(lineas) {
  let resultado = {};
  for (let i = 0; i < lineas.length; i++) {
    resultado[lineas[i].abbr] = true;
  }
  return resultado;
}

function App() {

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

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    let idSeguimiento = null;

    function alRecibirUbicacion(posicion) {
      setMiUbicacion([posicion.coords.latitude, posicion.coords.longitude]);
    }

    function alFallarUbicacion(error) {
      if (error && error.code === 1) {
        setMiUbicacion(null);
        if (idSeguimiento !== null) {
          navigator.geolocation.clearWatch(idSeguimiento);
          idSeguimiento = null;
        }
      }
    }

    idSeguimiento = navigator.geolocation.watchPosition(
      alRecibirUbicacion,
      alFallarUbicacion,
      OPCIONES_MI_UBICACION
    );

    return () => {
      if (idSeguimiento !== null) {
        navigator.geolocation.clearWatch(idSeguimiento);
      }
    };
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
        style={{ height: '100%', width: '100%' }}
      >

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          referrerPolicy="strict-origin-when-cross-origin"
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
          <CapaRecorridos ramales={sentidosLinea[sentidoRecorrido]} ramalesOcultos={ramalesOcultos} />
        )}

        {miUbicacion !== null && (
          <CircleMarker center={miUbicacion} radius={8} pathOptions={ESTILO_MI_UBICACION} />
        )}

      </MapContainer>

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

export default App;
