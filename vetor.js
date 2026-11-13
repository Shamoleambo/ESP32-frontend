// A localização do usuário não é enviada ao backend por este código.
window.addEventListener(
  "mapa:pronto",
  (evento) => {
    const { mapa, estacao } = evento.detail;

    const destino = L.latLng(estacao.latitude, estacao.longitude);

    const botao = document.getElementById("mostrar-vetor");
    const resultado = document.getElementById("resultado-vetor");

    const camadas = L.layerGroup().addTo(mapa);

    let origem = null;
    let ponta = null;

    // Mantém a ponta alinhada ao segmento ao mover ou ampliar o mapa.
    function atualizarPonta() {
      if (!origem || !ponta) return;

      const inicio = mapa.latLngToLayerPoint(origem);
      const fim = mapa.latLngToLayerPoint(destino);

      const dx = fim.x - inicio.x;
      const dy = fim.y - inicio.y;

      const angulo = (Math.atan2(dy, dx) * 180) / Math.PI;

      // A ponta fica a 80% do segmento para não cobrir a estação.
      const posicaoPonta = L.point(inicio.x + dx * 0.8, inicio.y + dy * 0.8);

      ponta.setLatLng(mapa.layerPointToLatLng(posicaoPonta));

      ponta.setIcon(
        L.divIcon({
          className: "ponta-vetor",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          html: `
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 28 28"
          aria-hidden="true"
        >
          <path
            d="M4 3 L25 14 L4 25 L10 14 Z"
            fill="#ffb020"
            stroke="#1a1a1a"
            stroke-width="1"
            transform="rotate(${angulo} 14 14)"
          />
        </svg>
      `,
        }),
      );
    }

    mapa.on("zoomend moveend", atualizarPonta);

    botao.disabled = false;
    resultado.textContent =
      "Clique no botão para mostrar sua posição e o vetor até a estação.";

    botao.addEventListener("click", () => {
      if (!window.isSecureContext || !navigator.geolocation) {
        resultado.textContent =
          "Localização indisponível. Abra o site por HTTPS " +
          "e use um navegador compatível.";
        return;
      }

      botao.disabled = true;
      resultado.textContent =
        "Obtendo sua localização. Autorize o acesso quando solicitado.";

      navigator.geolocation.getCurrentPosition(
        (posicao) => {
          try {
            origem = L.latLng(
              posicao.coords.latitude,
              posicao.coords.longitude,
            );

            // Substitui o resultado anterior, sem acumular marcadores.
            camadas.clearLayers();
            ponta = null;

            L.circleMarker(origem, {
              radius: 7,
              color: "#fff",
              weight: 2,
              fillColor: "#3388ff",
              fillOpacity: 1,
            })
              .bindPopup("Sua localização aproximada")
              .addTo(camadas);

            // Representa a precisão informada pelo navegador.
            L.circle(origem, {
              radius: posicao.coords.accuracy,
              color: "#3388ff",
              weight: 1,
              fillOpacity: 0.08,
            }).addTo(camadas);

            const distancia = mapa.distance(origem, destino);

            const formato = new Intl.NumberFormat("pt-BR", {
              maximumFractionDigits: 1,
            });

            const textoDistancia =
              distancia >= 1000
                ? `${formato.format(distancia / 1000)} km`
                : `${formato.format(distancia)} m`;

            let mensagem =
              `Distância direta aproximada: ${textoDistancia}. ` +
              "Precisão informada da sua posição: " +
              `${Math.round(posicao.coords.accuracy)} m. `;

            if (distancia < 1) {
              mensagem +=
                "As posições praticamente coincidem; " +
                "não há direção definida para a seta.";

              mapa.setView(origem, 18);
            } else {
              L.polyline([origem, destino], {
                color: "#ffb020",
                weight: 4,
              }).addTo(camadas);

              ponta = L.marker(destino, {
                interactive: false,
                keyboard: false,
              }).addTo(camadas);

              mapa.fitBounds(L.latLngBounds([origem, destino]), {
                padding: [35, 35],
                maxZoom: 17,
              });

              atualizarPonta();

              mensagem +=
                "Seta: você → estação. " + "Não representa uma rota por ruas.";
            }

            // Componentes aproximadas em um plano local.
            // Limitamos a exibição a deslocamentos de até 50 km.
            if (distancia <= 50000) {
              const rad = Math.PI / 180;
              const raioTerra = 6371000;

              const latitudeMedia = ((origem.lat + destino.lat) / 2) * rad;

              const deltaLongitude =
                ((destino.lng - origem.lng + 540) % 360) - 180;

              const leste =
                raioTerra * deltaLongitude * rad * Math.cos(latitudeMedia);

              const norte = raioTerra * (destino.lat - origem.lat) * rad;

              mensagem +=
                " Vetor local aproximado (leste, norte): " +
                `(${formato.format(leste)}, ` +
                `${formato.format(norte)}) m.`;
            } else {
              mensagem +=
                " Componentes no plano local omitidas: " +
                "distância superior a 50 km.";
            }

            resultado.textContent = mensagem;
          } catch (erro) {
            console.error("Falha ao desenhar vetor:", erro);

            resultado.textContent =
              "Não foi possível desenhar o vetor. Tente novamente.";
          } finally {
            botao.disabled = false;
          }
        },

        (erro) => {
          const mensagens = {
            1:
              "Permissão de localização recusada. Você pode " +
              "autorizá-la nas configurações do site.",

            2:
              "Sua localização não está disponível. Tente " +
              "novamente, preferencialmente no celular.",

            3:
              "O tempo para obter a localização terminou. " +
              "Tente novamente.",
          };

          resultado.textContent =
            mensagens[erro.code] || "Não foi possível obter sua localização.";

          if (origem) {
            resultado.textContent +=
              " O vetor anterior, se exibido, foi mantido.";
          }

          botao.disabled = false;
        },

        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        },
      );
    });
  },
  { once: true },
);
