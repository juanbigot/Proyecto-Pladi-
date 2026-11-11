import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMap, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import iconoParadaUrl from '../assets/marker-parada.svg';

export const ZOOM_MINIMO_PARADAS = 15;

const ICONO_PARADA = L.icon({
  iconUrl: iconoParadaUrl,
  iconSize: [26, 52],
  iconAnchor: [13, 52],
  popupAnchor: [0, -50],
});


const MarkerParada = memo(function MarkerParada({ parada, onElegir }) {

  const popupEstabaAbierto = useRef(false);

  const eventHandlers = useMemo(() => ({
    preclick: (evento) => {
      popupEstabaAbierto.current = evento.target.isPopupOpen();
    },
    click: () => {
      if (popupEstabaAbierto.current) {
        popupEstabaAbierto.current = false;
        onElegir(parada);
      }
    },
  }), [parada, onElegir]);

  return (
    <Marker position={parada.coords} icon={ICONO_PARADA} eventHandlers={eventHandlers}>
      <Popup>
        <div onClick={() => onElegir(parada)} style={{ cursor: 'pointer' }}>
          <strong>Parada {parada.id}</strong>
          <br />
          {parada.calle.join(' y ')}
        </div>
      </Popup>
    </Marker>
  );
});

function MarkersVisibles({ paradas, onElegirParada }) {

  const mapa = useMap();
  const [paradasVisibles, setParadasVisibles] = useState([]);

  function actualizarParadas() {

    if (mapa.getZoom() < ZOOM_MINIMO_PARADAS) {
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

  const elegirParada = useCallback((parada) => {
    mapa.closePopup();
    onElegirParada(parada);
  }, [mapa, onElegirParada]);

  useEffect(() => {

    actualizarParadas();

    mapa.on('moveend', actualizarParadas);

    return () => {
      mapa.off('moveend', actualizarParadas);
    };

  }, [paradas]);

  useEffect(() => {

    function alTocarAfuera(evento) {
      let elemento = evento.target;
      if (!elemento || !elemento.closest || !elemento.closest('.leaflet-container')) {
        mapa.closePopup();
      }
    }

    document.addEventListener('pointerdown', alTocarAfuera);

    return () => {
      document.removeEventListener('pointerdown', alTocarAfuera);
    };

  }, [mapa]);

  return (
    <>
      {paradasVisibles.map((parada) => (
        <MarkerParada key={parada.id} parada={parada} onElegir={elegirParada} />
      ))}
    </>
  );
}

export default MarkersVisibles;
