import { useEffect } from 'react';

function PantallaCarga({ visible, error }) {

  useEffect(() => {
    let pantalla = document.getElementById('carga-inicial');
    if (pantalla === null) {
      return;
    }

    pantalla.classList.toggle('carga-inicial--oculta', !visible);
    pantalla.classList.toggle('carga-inicial--error', error);
  }, [visible, error]);

  return null;
}

export default PantallaCarga;
