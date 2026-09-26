import React from 'react';

function Buscador({ seccionActiva, lineas, lineaSeleccionada, onSeleccionarLinea }) {
  return (
    <div className="buscador-container">
      {seccionActiva === 'direccion' && (
        <div className="buscador-card buscador-card--doble">
          <div className="buscador__campo">

            <input 
              type="text" 
              placeholder="Ubicación inicial" 
              className="buscador__input"
            />

          </div>
          
          <div className="buscador__campo">
            
            <input 
              type="text" 
              placeholder="Ubicación final" 
              className="buscador__input"
            />

          </div>

        </div>
      )}

      {seccionActiva === 'paradas' && (
        <div className="buscador-card">
          <input 
            type="text" 
            placeholder="Buscar por número" 
            className="buscador__input"
          />
        </div>
      )}

      {seccionActiva === 'recorrido' && (
        <div className="buscador-card">
          <select
            className="buscador__input"
            value={lineaSeleccionada}
            onChange={(evento) => onSeleccionarLinea(evento.target.value)}
          >
            {lineas.map((linea) => (
              <option key={linea.abbr} value={linea.abbr}>
                Línea {linea.nombre}
              </option>
            ))}
          </select>

        </div>
      )}
    </div>
  );
}

export default Buscador;
