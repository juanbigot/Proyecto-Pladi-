import { useEffect, useState } from 'react';
import { useMap, Marker } from 'react-leaflet';

const altura_Minima = 15;

function MarkersVisibles({ paradas }) {

  const mapa = useMap();
  const [paradasVisibles, setParadasVisibles] = useState([]);

  function actualizarParadas() {

    if (mapa.getZoom() < altura_Minima) {
      setParadasVisibles([]);
      return;
    }

    const limites = mapa.getBounds();

    const visibles = [];

    for (let i = 0; i < paradas.length; i++) {

      if (limites.contains(paradas[i].coords)) {
        visibles.push(paradas[i]);
      }

    }

    setParadasVisibles(visibles);
  }

  useEffect(() => {

    actualizarParadas();

    mapa.on('moveend', actualizarParadas);
    mapa.on('zoomend', actualizarParadas);

    return () => {
      mapa.off('moveend', actualizarParadas);
      mapa.off('zoomend', actualizarParadas);
    };

  }, [paradas]);

  return (
    <>
      {paradasVisibles.map((parada) => (
        <Marker
          key={parada.id}
          position={parada.coords}
        />
      ))}
    </>
  );
}

export default MarkersVisibles;