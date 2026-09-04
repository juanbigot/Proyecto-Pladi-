import React from 'react';

//flecha para las partes de paradas y recorrido
const IconoFlecha = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
);

function Buscador({ seccionActiva }) {
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
          <button type="button" className="buscador__btn-icon">
            <IconoFlecha />
          </button>
        </div>
      )}

      {seccionActiva === 'recorrido' && (
        <div className="buscador-card">
          <input 
            type="text" 
            placeholder="Buscar por línea" 
            className="buscador__input"
          />

          <button type="button" className="buscador__btn-icon">
            <IconoFlecha />
          </button>

        </div>
      )}
    </div>
  );
}

export default Buscador;