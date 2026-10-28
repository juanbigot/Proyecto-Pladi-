import { Fragment } from 'react';
import L from 'leaflet';
import { Polyline, CircleMarker, Marker, Popup } from 'react-leaflet';

const SIN_BURBUJA = { bubblingMouseEvents: false };


const ICONO_BANDERA = L.divIcon({
  className: 'marcador-bandera',
  html:
    '<svg width="34" height="34" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">' +
    '<g fill="#ffffff" stroke="#ffffff" stroke-width="5">' +
    '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>' +
    '<line x1="4" y1="22" x2="4" y2="15"/>' +
    '</g>' +
    '<g fill="#0d9be0" stroke="#0d9be0" stroke-width="2">' +
    '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>' +
    '<line x1="4" y1="22" x2="4" y2="15"/>' +
    '</g>' +
    '</svg>',
  iconSize: [34, 34],
  iconAnchor: [6, 31],
  popupAnchor: [11, -27],
});

function colorDeLinea(linea) {
  let color = '#0d9be0';
  if (linea.colors) {
    if (linea.colors.accent) {
      color = linea.colors.accent;
    }
  }
  return color;
}

function CapaViaje({ origen, destino, viaje }) {

  let tramos = [];
  let caminatas = [];

  if (viaje !== null && origen !== null && destino !== null) {
    tramos = viaje.tramos;

    caminatas.push([origen, tramos[0].subida.coords]);
    for (let i = 0; i < tramos.length - 1; i++) {
      caminatas.push([tramos[i].bajada.coords, tramos[i + 1].subida.coords]);
    }
    caminatas.push([tramos[tramos.length - 1].bajada.coords, destino]);
  }

  return (
    <>
      {caminatas.map((camino, i) => (
        <Polyline
          key={'caminata' + i}
          positions={camino}
          pathOptions={{ color: '#555555', weight: 3, dashArray: '6 8', ...SIN_BURBUJA }}
        />
      ))}

      {tramos.map((tramo, i) => {
        let partes = tramo.recorrido;

        return (
          <Polyline
            key={'borde' + i}
            positions={partes}
            pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.9, ...SIN_BURBUJA }}
          />
        );
      })}

      {tramos.map((tramo, i) => {
        let color = colorDeLinea(tramo.linea);
        let partes = tramo.recorrido;

        return (
          <Polyline
            key={'micro' + i}
            positions={partes}
            pathOptions={{ color: color, weight: 4, opacity: 1, ...SIN_BURBUJA }}
          >
            <Popup>Línea {tramo.linea.nombre} — {tramo.bandera.nombre}</Popup>
          </Polyline>
        );
      })}

      {tramos.map((tramo, i) => {
        let color = colorDeLinea(tramo.linea);

        return (
          <Fragment key={'paradas' + i}>
            <CircleMarker
              center={tramo.subida.coords}
              radius={6}
              pathOptions={{ color: color, weight: 3, fillColor: '#ffffff', fillOpacity: 1, ...SIN_BURBUJA }}
            >
              <Popup>Subí en la parada {tramo.subida.id} — {tramo.subida.calle.join(' y ')}</Popup>
            </CircleMarker>
            <CircleMarker
              center={tramo.bajada.coords}
              radius={6}
              pathOptions={{ color: color, weight: 3, fillColor: '#ffffff', fillOpacity: 1, ...SIN_BURBUJA }}
            >
              <Popup>Bajá en la parada {tramo.bajada.id} — {tramo.bajada.calle.join(' y ')}</Popup>
            </CircleMarker>
          </Fragment>
        );
      })}

      {origen !== null && (
        <CircleMarker
          center={origen}
          radius={10}
          pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#0d9be0', fillOpacity: 1, ...SIN_BURBUJA }}
        >
          <Popup>Punto de partida</Popup>
        </CircleMarker>
      )}

      {destino !== null && (
        <Marker position={destino} icon={ICONO_BANDERA}>
          <Popup>Punto de destino</Popup>
        </Marker>
      )}
    </>
  );
}

export default CapaViaje;
