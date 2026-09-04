import { MapPin, Bus, ArrowLeftRight } from 'lucide-react';

export default function Navegacion({ seccionActiva, onCambiarSeccion }) {

  let claseDireccion = 'nav__item';
  let claseParadas = 'nav__item';
  let claseRecorrido = 'nav__item';

  if (seccionActiva === 'direccion') {
    claseDireccion = 'nav__item nav__item--activo';
  }

  if (seccionActiva === 'paradas') {
    claseParadas = 'nav__item nav__item--activo';
  }

  if (seccionActiva === 'recorrido') {
    claseRecorrido = 'nav__item nav__item--activo';
  }

  return (
    <nav className="nav">

      <div className="nav__marca">
        PLADI
      </div>

      <div className="nav__lista">

        <button
          className={claseDireccion}
          onClick={() => onCambiarSeccion('direccion')}
        >
          <MapPin size={22} />
          <span>Dirección</span>
        </button>

        <button
          className={claseParadas}
          onClick={() => onCambiarSeccion('paradas')}
        >
          <Bus size={22} />
          <span>Paradas</span>
        </button>

        <button
          className={claseRecorrido}
          onClick={() => onCambiarSeccion('recorrido')}
        >
          <ArrowLeftRight size={22} /> 
          <span>Recorrido</span>
        </button>

      </div>

    </nav>
  );
}