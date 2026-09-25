import { Polyline, Popup } from 'react-leaflet';

function CapaRecorridos({ datosParadas, lineaSeleccionada }) {

  let lineaInfo = null;

  for (let i = 0; i < datosParadas.lineas.length; i++) {
    if (datosParadas.lineas[i].abbr === lineaSeleccionada) {
      lineaInfo = datosParadas.lineas[i];
    }
  }

  if (lineaInfo === null) {
    return null;
  }

  let banderas = [];

  for (let i = 0; i < datosParadas.banderas.length; i++) {
    let bandera = datosParadas.banderas[i];

    let perteneceALaLinea = false;
    for (let j = 0; j < lineaInfo.codigos.length; j++) {
      if (lineaInfo.codigos[j] === bandera.linea) {
        perteneceALaLinea = true;
      }
    }

    let tieneRecorrido = false;
    if (bandera.recorrido) {
      if (bandera.recorrido.length > 0) {
        tieneRecorrido = true;
      }
    }

    if (perteneceALaLinea && tieneRecorrido) {
      banderas.push(bandera);
    }
  }

  // color predeterminado
  let color = '#e63946';
  if (lineaInfo.colors) {
    if (lineaInfo.colors.accent) {
      color = lineaInfo.colors.accent;
    }
  }

  return (
    <>
      {banderas.map((bandera) => (
        <Polyline
          key={bandera.id}
          positions={bandera.recorrido}
          pathOptions={{ color: color, weight: 4, opacity: 0.85 }}
        >
          <Popup>{bandera.nombre}</Popup>
        </Polyline>
      ))}
    </>
  );
}

export default CapaRecorridos;
