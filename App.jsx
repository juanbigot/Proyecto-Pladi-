import { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import Navegacion from './componentes/Navegacion.jsx';
import Buscador from './componentes/Buscador.jsx';
import MarkersVisibles from './componentes/MarkersVisibles.jsx';
import CapaRecorridos from './componentes/CapaRecorridos.jsx';
import datosParadas from './ubicacionParadas.json';
import './App.css';

const centroLaPlata = [-34.9214, -57.9544];

function App() {

  const [seccionActiva, setSeccionActiva] = useState('direccion');
  const [lineaSeleccionada, setLineaSeleccionada] = useState(datosParadas.lineas[0].abbr);

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative' }}>

      <MapContainer
        center={centroLaPlata}
        zoom={15}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {seccionActiva === 'paradas' && (
          <MarkersVisibles paradas={datosParadas.paradas} />
        )}

        {seccionActiva === 'recorrido' && (
          <CapaRecorridos datosParadas={datosParadas} lineaSeleccionada={lineaSeleccionada} />
        )}

      </MapContainer>

      <Buscador
        seccionActiva={seccionActiva}
        lineas={datosParadas.lineas}
        lineaSeleccionada={lineaSeleccionada}
        onSeleccionarLinea={setLineaSeleccionada}
      />

      <Navegacion
        seccionActiva={seccionActiva}
        onCambiarSeccion={setSeccionActiva}
      />

    </div>
  );
}

export default App;
