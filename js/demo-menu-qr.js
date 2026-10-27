// ============================================================
//  DEMO-MENU-QR.JS - Menú digital con código QR (demostración)
//  Asociación Tecnológica Monterroso
// ============================================================
//
//  Para un menú real, el dueño solo cambia la lista MENU:
//  nombre, descripción, precio y disponibilidad de cada plato.
//  El resto (categorías, precios, aviso de agotado y código QR)
//  se arma solo.
// ============================================================

(function () {

  // ----------------------------------------------------------
  //  Datos del menú de ejemplo (Comedor Doña Chela)
  // ----------------------------------------------------------

  const MENU = [
    {
      id: "dia",
      titulo: "Platos del día",
      nota: "Incluyen arroz y tortillas.",
      platos: [
        { n: "Pepián de pollo", d: "Pollo en recado espeso de pepitoria y chile guaque.", p: 38, tags: ["Del día"], ok: true },
        { n: "Jocón", d: "Pollo en salsa verde de tomatillo y cilantro.", p: 36, ok: true },
        { n: "Caldo de gallina", d: "Con güisquil, zanahoria y hierbabuena.", p: 35, ok: true },
        { n: "Hilachas", d: "Carne deshebrada en salsa de tomate, con papas.", p: 36, ok: false }
      ]
    },
    {
      id: "antojitos",
      titulo: "Antojitos",
      platos: [
        { n: "Chuchitos (2)", d: "De pollo, con salsa de tomate y queso seco.", p: 12, ok: true },
        { n: "Tamalitos de chipilín (2)", d: "Masa de maíz con chipilín y queso.", p: 10, tags: ["Vegetariano"], ok: true },
        { n: "Tostadas (3)", d: "Frijol molido, guacamol y salsa.", p: 15, tags: ["Vegetariano"], ok: true }
      ]
    },
    {
      id: "bebidas",
      titulo: "Bebidas",
      platos: [
        { n: "Atol de elote", d: "Caliente, con canela.", p: 10, ok: true },
        { n: "Horchata", d: "Fría, con semilla de morro y canela.", p: 9, ok: true },
        { n: "Café de olla", d: "Con panela y canela.", p: 8, ok: true },
        { n: "Fresco de rosa de jamaica", d: "Vaso grande.", p: 8, ok: true },
        { n: "Agua pura", d: "Botella de 600 ml.", p: 5, ok: true }
      ]
    },
    {
      id: "postres",
      titulo: "Postres",
      platos: [
        { n: "Rellenitos de plátano (3)", d: "Plátano macho relleno de frijol dulce.", p: 12, ok: true },
        { n: "Mole de plátano", d: "Plátano frito en mole de chocolate y ajonjolí.", p: 14, ok: true },
        { n: "Buñuelos con miel (3)", d: "Con miel de panela.", p: 12, ok: true }
      ]
    }
  ];

  const q = (n) => "Q" + n;
  const menuEl = document.getElementById("menu");
  const navEl = document.getElementById("nav-categorias");

  // ----------------------------------------------------------
  //  Dibuja las categorías y los platos
  // ----------------------------------------------------------

  function dibujar() {

    navEl.innerHTML = MENU.map((c) =>
      `<li><a href="#${c.id}">${c.titulo}</a></li>`
    ).join("");

    menuEl.innerHTML = MENU.map((c, ci) => `
        <section class="seccion" id="${c.id}" aria-labelledby="h-${c.id}">
          <h2 id="h-${c.id}">${c.titulo}</h2>
          ${c.nota ? `<p class="nota">${c.nota}</p>` : ""}
          ${c.platos.map((p, pi) => `
            <article class="plato ${p.ok ? "" : "no-hay"}" data-c="${ci}" data-p="${pi}">
              <div class="fila">
                <span class="nombre">${p.n}</span><span class="puntos" aria-hidden="true"></span>
                <span class="precio">${q(p.p)}</span>
              </div>
              <p class="desc">${p.d}</p>
              <div class="etiquetas">
                ${(p.tags || []).map(t => `<span class="tag ${t === "Vegetariano" ? "veg" : ""}">${t}</span>`).join("")}
                ${p.ok ? "" : `<span class="tag agotado">Agotado</span>`}
                <label class="interruptor">
                  <input type="checkbox" ${p.ok ? "checked" : ""} aria-label="Disponible: ${p.n}">
                  <span class="riel"></span> Disponible
                </label>
              </div>
            </article>`).join("")}
        </section>`).join("");
  }

  // ----------------------------------------------------------
  //  Modo dueño: marcar un plato como disponible o agotado
  // ----------------------------------------------------------

  menuEl.addEventListener("change", (e) => {

    if (!e.target.matches("input[type=checkbox]")) return;

    const art = e.target.closest(".plato");
    MENU[+art.dataset.c].platos[+art.dataset.p].ok = e.target.checked;

    dibujar();

    // Devuelve el foco al mismo interruptor tras redibujar.
    const sel = `.plato[data-c="${art.dataset.c}"][data-p="${art.dataset.p}"] input`;
    const nuevo = document.querySelector(sel);
    if (nuevo) nuevo.focus();
  });

  const btn = document.getElementById("btn-dueno");

  btn.addEventListener("click", () => {

    const activo = document.body.classList.toggle("modo-dueno");

    btn.setAttribute("aria-pressed", activo);
    btn.textContent = activo ? "Volver a la vista del cliente" : "Probar como dueño";
  });

  // ----------------------------------------------------------
  //  Categoría activa según el scroll
  // ----------------------------------------------------------

  function marcarActiva() {

    const y = window.scrollY + 120;
    let actual = MENU[0].id;

    MENU.forEach((c) => {
      const s = document.getElementById(c.id);
      if (s && s.offsetTop <= y) actual = c.id;
    });

    navEl.querySelectorAll("a").forEach((a) => {
      a.classList.toggle("activa", a.getAttribute("href") === "#" + actual);
    });
  }

  window.addEventListener("scroll", marcarActiva, { passive: true });

  // ----------------------------------------------------------
  //  Botón de WhatsApp
  // ----------------------------------------------------------

  const msg = "Hola, vi la demo del menú QR y quiero uno para mi negocio.";
  document.getElementById("wa").href =
    "https://wa.me/50248975506?text=" + encodeURIComponent(msg);

  dibujar();
  marcarActiva();

  // ----------------------------------------------------------
  //  Código QR: abre esta misma página
  // ----------------------------------------------------------

  try {
    if (window.QRCode) {
      new QRCode(document.getElementById("codigo-qr"), {
        text: location.href.split("#")[0],
        width: 176,
        height: 176,
        colorDark: "#17302b",
        colorLight: "#f2efe6",
        correctLevel: QRCode.CorrectLevel.M
      });
    }
  } catch (e) {
    // Si no carga la librería, el resto del menú sigue funcionando.
  }

})();
