import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import Navegacion from './componentes/Navegacion.jsx';
import Buscador from './componentes/Buscador.jsx'; 
import datosParadas from './ubicacionParadas.json';
import './App.css';

const centroLaPlata = [-34.9214, -57.9544];

function App() {
  const [seccionActiva, setSeccionActiva] = useState('direccion');

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative' }}>
      <MapContainer center={centroLaPlata} zoom={16} zoomControl={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      
        {seccionActiva === 'paradas' &&
          datosParadas.paradas.map((parada) => (
            <Marker key={parada.id} position={parada.coords}>
            </Marker>
          ))}
      </MapContainer>

      <Buscador seccionActiva={seccionActiva} />
      <Navegacion seccionActiva={seccionActiva} onCambiarSeccion={setSeccionActiva} />
    </div>
  );
}

export default App;