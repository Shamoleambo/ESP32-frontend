// Reutiliza API_BASE, definido em script.js.
// A localização é consultada separadamente das leituras dos sensores.

async function carregarMapa() {
  const elementoMapa = document.getElementById("map");
  const aviso = document.getElementById("map-fallback");
  const localizacao = document.getElementById("recent-locations");

  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), 10000);

  try {
    if (typeof L === "undefined") {
      throw new Error("A biblioteca Leaflet não foi carregada.");
    }

    const resposta = await fetch(`${API_BASE}/api/estacao`, {
      signal: controlador.signal,
      cache: "no-store",
    });

    if (!resposta.ok) {
      throw new Error(`Resposta HTTP ${resposta.status}`);
    }

    const estacao = await resposta.json();

    if (
      typeof estacao.estacao_id !== "string" ||
      !Number.isFinite(estacao.latitude) ||
      !Number.isFinite(estacao.longitude) ||
      estacao.latitude < -90 ||
      estacao.latitude > 90 ||
      estacao.longitude < -180 ||
      estacao.longitude > 180
    ) {
      throw new Error("Coordenadas da estação inválidas.");
    }

    elementoMapa.hidden = false;

    const coordenadas = [estacao.latitude, estacao.longitude];

    const mapa = L.map("map").setView(coordenadas, 16);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">' +
        "OpenStreetMap</a> contributors",
    }).addTo(mapa);

    const conteudo = document.createElement("div");

    const nome = document.createElement("strong");
    nome.textContent = estacao.nome || estacao.estacao_id;

    const identificacao = document.createElement("div");
    identificacao.textContent = estacao.estacao_id;

    const posicao = document.createElement("div");
    posicao.textContent =
      `Latitude: ${estacao.latitude.toFixed(6)}; ` +
      `longitude: ${estacao.longitude.toFixed(6)}.`;

    conteudo.append(nome, identificacao, posicao);

    L.marker(coordenadas).addTo(mapa).bindPopup(conteudo).openPopup();

    localizacao.textContent =
      `${estacao.nome || estacao.estacao_id} — ` +
      `${estacao.latitude.toFixed(6)}, ` +
      `${estacao.longitude.toFixed(6)} ` +
      "(localização cadastrada manualmente).";

    aviso.style.display = "none";

    requestAnimationFrame(() => mapa.invalidateSize());
  } catch (erro) {
    console.error("Falha ao carregar o mapa:", erro);

    elementoMapa.hidden = true;
    aviso.style.display = "grid";
    aviso.textContent =
      "Não foi possível carregar o mapa. " +
      "Confira a conexão e as coordenadas cadastradas; " +
      "depois atualize a página.";

    localizacao.textContent = "Localização indisponível.";
  } finally {
    clearTimeout(limite);
  }
}

carregarMapa();
