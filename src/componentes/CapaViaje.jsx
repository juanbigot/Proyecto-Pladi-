import { Fragment } from 'react';
import { Polyline, CircleMarker, Popup } from 'react-leaflet';

const SIN_BURBUJA = { bubblingMouseEvents: false };

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
          pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#16a34a', fillOpacity: 1, ...SIN_BURBUJA }}
        >
          <Popup>Punto de partida</Popup>
        </CircleMarker>
      )}

      {destino !== null && (
        <CircleMarker
          center={destino}
          radius={10}
          pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#dc2626', fillOpacity: 1, ...SIN_BURBUJA }}
        >
          <Popup>Punto de destino</Popup>
        </CircleMarker>
      )}
    </>
  );
}

export default CapaViaje;
