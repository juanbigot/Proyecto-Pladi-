import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import Navegacion from './componentes/Navegacion.jsx';
import Buscador from './componentes/Buscador.jsx';
import MarkersVisibles from './componentes/MarkersVisibles.jsx';
import CapaRecorridos from './componentes/CapaRecorridos.jsx';
import datosParadas from './ubicacionParadas.json';
import './App.css';

const centroLaPlata = [-34.9214, -57.9544];

function crearLineasVisibles(lineas) {
  let resultado = {};
  for (let i = 0; i < lineas.length; i++) {
    resultado[lineas[i].abbr] = true;
  }
  return resultado;
}

function App() {

  const [seccionActiva, setSeccionActiva] = useState('recorrido');
  const [lineaSeleccionada, setLineaSeleccionada] = useState(datosParadas.lineas[0].abbr);
  const [mapa, setMapa] = useState(null);
  const [paradaSeleccionada, setParadaSeleccionada] = useState(null);
  const [banderaMostrada, setBanderaMostrada] = useState(null);
  const [lineasVisibles, setLineasVisibles] = useState(crearLineasVisibles(datosParadas.lineas));

 
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

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative' }}>

      <MapContainer
        ref={setMapa}
        center={centroLaPlata}
        zoom={15}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {seccionActiva === 'paradas' && banderaMostrada === null && (
          <MarkersVisibles paradas={paradasFiltradas} onElegirParada={setParadaSeleccionada} />
        )}

        {seccionActiva === 'paradas' && banderaMostrada !== null && (
          <Polyline positions={banderaMostrada.recorrido} pathOptions={{ color: '#0d9be0', weight: 4 }} />
        )}

        {seccionActiva === 'recorrido' && (
          <CapaRecorridos datosParadas={datosParadas} lineaSeleccionada={lineaSeleccionada} />
        )}

      </MapContainer>

      <Buscador
        seccionActiva={seccionActiva}
        datosParadas={datosParadas}
        lineaSeleccionada={lineaSeleccionada}
        onSeleccionarLinea={setLineaSeleccionada}
        mapa={mapa}
        paradaSeleccionada={paradaSeleccionada}
        onElegirParada={setParadaSeleccionada}
        onMostrarBandera={setBanderaMostrada}
        lineasVisibles={lineasVisibles}
        onCambiarLineasVisibles={setLineasVisibles}
      />

      <Navegacion
        seccionActiva={seccionActiva}
        onCambiarSeccion={setSeccionActiva}
      />

    </div>
  );
}

export default App;
