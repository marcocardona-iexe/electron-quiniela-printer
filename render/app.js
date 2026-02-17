let quinielas = [];
let consecutivoActual = 1;

document.getElementById("fileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = (event) => {
    quinielas = event.target.result
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    mostrarAlerta(
      "Archivo cargado: " + quinielas.length + " quinielas",
      "info",
    );
  };

  reader.readAsText(file);
});

function crearLineasGuia(clase) {
  const cont = document.createElement("div");
  cont.className = clase;

  ["l1", "l2", "l3"].forEach((pos) => {
    const l = document.createElement("div");
    l.className = "linea " + pos;
    cont.appendChild(l);
  });

  return cont;
}

function crearFilaGuia() {
  const fila = document.createElement("div");
  fila.className = "fila-partido";
  const guia = document.createElement("div");
  guia.className = "guia-inicio";
  fila.appendChild(guia);
  return fila;
}

function renderizarBoleto(linea, numero) {
  document.getElementById("numeroQuiniela").textContent = numero;

  const contenedor = document.getElementById("rejilla");
  contenedor.innerHTML = "";

  const partidos = [...linea].slice(0, 14);

  partidos.forEach((char) => {
    const fila = document.createElement("div");
    fila.className = "fila-partido";

    const guia = document.createElement("div");
    guia.className = "guia-inicio";

    const l1 = document.createElement("div");
    const lx = document.createElement("div");
    const l2 = document.createElement("div");

    l1.className = "linea-apuesta pos-1";
    lx.className = "linea-apuesta pos-x";
    l2.className = "linea-apuesta pos-2";

    if (char === "1") l1.classList.add("marcada");
    if (char === "X") lx.classList.add("marcada");
    if (char === "2") l2.classList.add("marcada");

    fila.appendChild(guia);
    fila.appendChild(l1);
    fila.appendChild(lx);
    fila.appendChild(l2);

    contenedor.appendChild(fila);
  });

  contenedor.appendChild(crearFilaGuia());
  contenedor.appendChild(crearLineasGuia("lineas-fila-secundaria"));

  for (let i = 0; i < 7; i++) contenedor.appendChild(crearFilaGuia());

  const final = document.createElement("div");
  final.className = "guia-final";
  contenedor.appendChild(final);

  contenedor.appendChild(crearLineasGuia("lineas-fila-final"));
}

async function imprimirLote() {
  if (!quinielas.length) {
    mostrarAlerta("Carga un archivo primero", "danger");
    return;
  }

  cancelarImpresion = false;
  imprimiendo = true;

  const inicioFila = parseInt(document.getElementById("filaInicio").value) || 1;
  const finFila =
    parseInt(document.getElementById("filaFin").value) || quinielas.length;
  const inicioConsecutivo =
    parseInt(document.getElementById("inicioConsecutivo").value) || 1;

  document.getElementById("numeroConcursoTicket").textContent =
    document.getElementById("numeroConcurso").value || "1";

  if (inicioFila < 1 || finFila > quinielas.length || inicioFila > finFila) {
    mostrarAlerta("Rango de filas inválido", "danger");
    imprimiendo = false;
    return;
  }

  const subset = quinielas.slice(inicioFila - 1, finFila).reverse();
  let consecutivoFinal = inicioConsecutivo + subset.length - 1;

  for (let i = 0; i < subset.length; i++) {
    if (cancelarImpresion) {
      mostrarAlerta("Impresión detenida por el usuario", "warning");
      imprimiendo = false;
      return;
    }

    renderizarBoleto(subset[i], consecutivoFinal--);

    await new Promise((r) => setTimeout(r, 250));

    if (cancelarImpresion) {
      mostrarAlerta("Impresión detenida", "warning");
      imprimiendo = false;
      return;
    }

    await window.electronAPI.printTicket(impresoraSeleccionada);

    await new Promise((r) => setTimeout(r, 1300));
  }

  imprimiendo = false;
  mostrarAlerta(`Lote terminado (${inicioFila} - ${finFila})`, "success");
}

// document.getElementById("printAll").addEventListener("click", () => {
//   if (!quinielas.length) {
//     mostrarAlerta("Carga un archivo primero", "danger");
//     return;
//   }

//   // ✅ NUEVA VALIDACIÓN DEL FORMULARIO
//   if (!validarFormulario()) return;

//   imprimirLote();
// });

let impresoraSeleccionada = "";
let cancelarImpresion = false;
let imprimiendo = false;

document.addEventListener("DOMContentLoaded", async () => {
  const select = document.getElementById("printerSelect");

  const printers = await window.electronAPI.getPrinters();

  printers.forEach((p) => {
    const option = document.createElement("option");
    option.value = p.name;
    option.textContent = p.name;
    select.appendChild(option);
  });

  if (printers.length) {
    impresoraSeleccionada = printers[0].name;
    select.value = impresoraSeleccionada;
  }

  select.addEventListener("change", () => {
    impresoraSeleccionada = select.value;
  });
});

// Mostrar nombre del archivo
document.getElementById("btnFile").addEventListener("click", () => {
  document.getElementById("fileInput").click();
});

document.getElementById("fileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    document.getElementById("fileName").textContent = file.name;
  }
});

// Solo permitir números en inputs tipo texto
["filaInicio", "filaFin", "inicioConsecutivo", "numeroConcurso"].forEach(
  (id) => {
    document.getElementById(id).addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "");
    });
  },
);

function mostrarAlerta(mensaje, tipo = "warning") {
  const container = document.getElementById("alertContainer");

  container.innerHTML = `
    <div class="alert alert-${tipo} alert-dismissible fade show text-center" role="alert">
      ${mensaje}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
}

function validarFormulario() {
  const printer = document.getElementById("printerSelect").value.trim();
  const desde = document.getElementById("filaInicio").value.trim();
  const hasta = document.getElementById("filaFin").value.trim();
  const concurso = document.getElementById("numeroConcurso").value.trim();
  const consecutivo = document.getElementById("inicioConsecutivo").value.trim();

  const alertContainer = document.getElementById("alertContainer");
  alertContainer.innerHTML = "";

  function mostrarError(mensaje, elemento) {
    alertContainer.innerHTML = `
      <div class="alert alert-danger py-2 mb-2">
        ${mensaje}
      </div>
    `;
    elemento.focus();
  }

  if (!printer) {
    mostrarError(
      "Selecciona una impresora.",
      document.getElementById("printerSelect"),
    );
    return false;
  }

  if (!desde || !hasta) {
    mostrarError(
      "Debes indicar el rango de filas (Desde - Hasta).",
      document.getElementById("filaInicio"),
    );
    return false;
  }

  if (parseInt(desde) > parseInt(hasta)) {
    mostrarError(
      "El rango no es válido: 'Desde' no puede ser mayor que 'Hasta'.",
      document.getElementById("filaInicio"),
    );
    return false;
  }

  if (!concurso) {
    mostrarError(
      "Ingresa el número de concurso.",
      document.getElementById("numeroConcurso"),
    );
    return false;
  }

  if (!consecutivo) {
    mostrarError(
      "Ingresa el consecutivo inicial.",
      document.getElementById("inicioConsecutivo"),
    );
    return false;
  }

  return true;
}

const btnPrint = document.getElementById("printAll");
const btnStop = document.getElementById("stopPrint");

btnPrint.addEventListener("click", () => {
  if (imprimiendo) return;

  if (!validarFormulario()) return;

  btnPrint.disabled = true;
  btnStop.disabled = false;

  imprimirLote().finally(() => {
    btnPrint.disabled = false;
    btnStop.disabled = true;
  });
});

btnStop.addEventListener("click", () => {
  cancelarImpresion = true;
});
