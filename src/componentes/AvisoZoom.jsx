import { useState, useEffect } from 'react';
import { ZoomIn } from 'lucide-react';
import { ZOOM_MINIMO_PARADAS } from './MarkersVisibles.jsx';


function AvisoZoom({ mapa, visible, zoomDestino }) {

  const [zoomActual, setZoomActual] = useState(null);

  useEffect(() => {
    if (mapa === null) {
      return;
    }

    function actualizarZoom() {
      setZoomActual(mapa.getZoom());
    }

    actualizarZoom();
    mapa.on('zoomend', actualizarZoom);

    return () => {
      mapa.off('zoomend', actualizarZoom);
    };
  }, [mapa]);

  if (!visible || mapa === null || zoomActual === null || zoomActual >= ZOOM_MINIMO_PARADAS) {
    return null;
  }

  return (
    <button
      type="button"
      className="aviso-zoom"
      onClick={() => mapa.setZoom(zoomDestino)}
    >
      <ZoomIn size={18} />
      <span>Aumentá el zoom para ver las paradas</span>
    </button>
  );
}

export default AvisoZoom;
