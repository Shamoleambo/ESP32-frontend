(function () {
  const $ = (sel) => document.querySelector(sel);
  

  const formatoNumero = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  let ultimaDataRecebida = null;
  const LIMITE_LEITURA_ANTIGA_MS = 15000; 

  function renderAtual(l) {
    if (!l) return;
    
    $("#temperatura").textContent = l.temperatura_c === null ? "— °C" : `${formatoNumero.format(l.temperatura_c)} °C`;
    $("#humidade").textContent    = l.umidade_pct === null ? "—%" : `${formatoNumero.format(l.umidade_pct)}%`;
    $("#pressao").textContent     = l.pressao_hpa === null ? "— hPa" : `${formatoNumero.format(l.pressao_hpa)} hPa`;
    $("#luz").textContent         = l.luz ?? "—";
    $("#qualidade-ar").textContent = l.qualidade_ar ?? "—";
    $("#local-nome").textContent  = `Estação ${l.estacao_id}`;
  }


  function mostrarStatus(erro) {
    const statusEl = $("#connection-status");
    const sinalEl  = $("#signal-status");

    if (!erro && ultimaDataRecebida) {
      const idade = Date.now() - ultimaDataRecebida.getTime();
      if (idade > LIMITE_LEITURA_ANTIGA_MS) {
        statusEl.textContent = "Aviso";
        statusEl.classList.remove("online");
        sinalEl.textContent = "Dados antigos: última leitura há mais de 15s.";
        return;
      }
      statusEl.textContent = "Online";
      statusEl.classList.add("online");
    }

    if (erro) {
      if (erro.message === "SEM_DADOS_404") {
        statusEl.textContent = "Aguardando";
        statusEl.classList.remove("online");
        sinalEl.textContent = "Ainda não existem leituras armazenadas.";
      } else {
        statusEl.textContent = "Offline";
        statusEl.classList.remove("online");
        sinalEl.textContent = "Não foi possível consultar o backend. Tentando novamente...";
      }
    }
  }


  function renderStatusSensores(l) {
    const sinalEl = $("#signal-status");
    if (!l) return;
    
    const es = l.estado_sensores || {};
    const fora = Object.entries(es).filter(([, v]) => v !== "ok").map(([k, v]) => `${k}: ${API.SENSOR_LABEL[v] || v}`);
    

    if (fora.length === 0) {
      sinalEl.textContent = "Todos os sensores ok";
    } else {
      sinalEl.textContent = `Atenção — ${fora.join(", ")}`;
    }
  }


  const recentes = [];
  function renderRecentes() {
    const box = $("#recent-data");
    if (!box) return;
    
    if (!recentes.length) {
      box.innerHTML = `<div class="empty-data">Aguardando as primeiras medições da estação.</div>`;
      return;
    }

    box.innerHTML = `
      <div class="data-row" style="font-weight: 600; border-bottom: 2px solid rgba(124, 157, 255, .3); color: var(--accent);">
        <span>Hora</span>
        <span>Temp.</span>
        <span>Umid.</span>
        <span>Pressão</span>
        <span>Luz</span>
        <span>Ar</span>
      </div>
    ` + recentes.slice(0, 10).map((l) => {
      const h = new Date(l.recebido_em).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="data-row">
          <span class="data-label">${h}</span>
          <span>${l.temperatura_c === null ? "—" : formatoNumero.format(l.temperatura_c) + "°C"}</span>
          <span>${l.umidade_pct === null ? "—" : formatoNumero.format(l.umidade_pct) + "%"}</span>
          <span>${l.pressao_hpa === null ? "—" : formatoNumero.format(l.pressao_hpa) + " hPa"}</span>
          <span style="font-size: 12px;">${l.luz ?? "—"}</span>
          <span style="font-size: 12px;">${l.qualidade_ar ?? "—"}</span>
        </div>`;
    }).join("");
  }


  window.addEventListener("leitura:recebida", (ev) => {
    const l = ev.detail;
    ultimaDataRecebida = new Date(l.recebido_em);
    
    renderAtual(l);
    renderStatusSensores(l);
    mostrarStatus(null); 
    
    recentes.unshift(l);
    if (recentes.length > 50) recentes.pop();
    renderRecentes();
  });


  window.addEventListener("leitura:erro", (ev) => {
    const e = ev.detail;
    mostrarStatus(e);

  });

  document.addEventListener("DOMContentLoaded", () => {
    renderRecentes();
    

    API.iniciarPolling({ intervalo: 2000 });
  });
})();