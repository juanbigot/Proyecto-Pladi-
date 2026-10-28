import { useState, useEffect } from 'react';
import { MapPin, Bus, ArrowLeftRight } from 'lucide-react';
import logoPladi from '../assets/logo-pladi.png';

function hayCampoDeTexto() {
  let elemento = document.activeElement;
  if (!elemento) {
    return false;
  }
  if (elemento.tagName === 'TEXTAREA') {
    return true;
  }
  if (elemento.tagName !== 'INPUT') {
    return false;
  }
  let sinTeclado = ['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'image'];
  return !sinTeclado.includes(elemento.type);
}

export default function Navegacion({ seccionActiva, onCambiarSeccion }) {

  
  const [escribiendo, setEscribiendo] = useState(false);

  useEffect(() => {
    let temporizador = null;

    function alSeleccionarCampo() {
      clearTimeout(temporizador);
      setEscribiendo(hayCampoDeTexto());
    }


    function alSoltarCampo() {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => setEscribiendo(hayCampoDeTexto()), 100);
    }

    document.addEventListener('focusin', alSeleccionarCampo);
    document.addEventListener('focusout', alSoltarCampo);
    return () => {
      clearTimeout(temporizador);
      document.removeEventListener('focusin', alSeleccionarCampo);
      document.removeEventListener('focusout', alSoltarCampo);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('escribiendo', escribiendo);
  }, [escribiendo]);

  let claseNav = 'nav';
  if (escribiendo) {
    claseNav = 'nav nav--oculta';
  }

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
    <nav className={claseNav}>

      <img className="nav__marca" src={logoPladi} alt="PLADI" draggable="false" />

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