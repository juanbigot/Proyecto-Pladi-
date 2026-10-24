import { Polyline, Popup } from 'react-leaflet';

const PALETA_RAMALES = [
  '#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#42d4f4',
  '#f032e6', '#9a6324', '#008080', '#800000', '#808000', '#000075',
];

export function colorDeRamal(posicion) {
  if (posicion < PALETA_RAMALES.length) {
    return PALETA_RAMALES[posicion];
  }

  let extra = posicion - PALETA_RAMALES.length;
  let tono = Math.round((extra * 137.508) % 360);
  let luminosidad = 42;
  if (extra % 2 === 1) {
    luminosidad = 58;
  }
  return 'hsl(' + tono + ', 72%, ' + luminosidad + '%)';
}

function CapaRecorridos({ datosParadas, lineaSeleccionada, ramalesOcultos }) {

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
  let posicion = 0;

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

    if (!perteneceALaLinea || !tieneRecorrido) {
      continue;
    }

    if (ramalesOcultos[bandera.id] !== true) {
      banderas.push({ bandera: bandera, color: colorDeRamal(posicion) });
    }
    posicion++;
  }

  return (
    <>
      {banderas.map((item) => (
        <Polyline
          key={item.bandera.id}
          positions={item.bandera.recorrido}
          pathOptions={{ color: item.color, weight: 4, opacity: 0.85 }}
        >
          <Popup>{item.bandera.nombre}</Popup>
        </Polyline>
      ))}
    </>
  );
}

export default CapaRecorridos;
