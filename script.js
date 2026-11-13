// Endereço do backend local.
const API_BASE = "http://127.0.0.1:5000";

const INTERVALO_MS = 2000;
const LIMITE_DADOS_ANTIGOS_MS = 15000;

const formatoNumero = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

const estadosTexto = {
  erro_leitura: "falha na leitura",
  nao_configurado: "não configurado",
  aquecendo: "aquecendo",
};

const recentes = [];
let ultimaChave = null;

function escrever(id, valor) {
  document.getElementById(id).textContent = valor;
}

function mostrarStatus(titulo, mensagem, online = false) {
  const elemento = document.getElementById("connection-status");

  elemento.textContent = titulo;
  elemento.classList.toggle("online", online);

  escrever("signal-status", mensagem);
}

function prepararLeitura(dados) {
  if (
    !dados ||
    typeof dados.estacao_id !== "string" ||
    !dados.leituras ||
    !dados.estado_sensores ||
    typeof dados.recebido_em !== "string" ||
    Number.isNaN(Date.parse(dados.recebido_em))
  ) {
    throw new Error("Formato de resposta inesperado.");
  }

  const leituras = dados.leituras;
  const estados = dados.estado_sensores;

  function formatar(campo, sensor, unidade) {
    const valor = leituras[campo];

    if (estados[sensor] !== "ok" || !Number.isFinite(valor)) {
      return "—";
    }

    return `${formatoNumero.format(valor)}${unidade}`;
  }

  let luz = "—";

  if (estados.ldr === "ok") {
    if (leituras.luminosidade_digital === 0) {
      luz = "Acima do limiar";
    } else if (leituras.luminosidade_digital === 1) {
      luz = "Abaixo do limiar";
    }
  }

  return {
    temperatura: formatar("temperatura_c", "dht22", " °C"),
    umidade: formatar("umidade_pct", "dht22", " %"),
    pressao: formatar("pressao_hpa", "bmp280", " hPa"),
    luz,
    ar: formatar("mq135_adc", "mq135", " (ADC bruto)"),
  };
}

function renderizar(dados) {
  const leitura = prepararLeitura(dados);

  escrever("temperatura", leitura.temperatura);

  // O HTML do PR usa "humidade" como identificador.
  escrever("humidade", leitura.umidade);

  escrever("pressao", leitura.pressao);
  escrever("luz", leitura.luz);
  escrever("qualidade-ar", leitura.ar);
  escrever("local-nome", `Estação ${dados.estacao_id}`);

  const idade = Date.now() - Date.parse(dados.recebido_em);
  const dadosAntigos = idade > LIMITE_DADOS_ANTIGOS_MS;

  const falhas = Object.entries(dados.estado_sensores)
    .filter(([, estado]) => estado !== "ok")
    .map(([sensor, estado]) => `${sensor}: ${estadosTexto[estado] || estado}`);

  const mensagemSensores = falhas.length
    ? falhas.join("; ")
    : "Todos os sensores com leitura disponível.";

  mostrarStatus(
    dadosAntigos ? "Dados antigos" : "Online",
    dadosAntigos
      ? `Última leitura há mais de 15 segundos. ${mensagemSensores}`
      : mensagemSensores,
    !dadosAntigos,
  );

  // Evita repetir a mesma leitura a cada consulta.
  const chave = JSON.stringify([dados.estacao_id, dados.id, dados.recebido_em]);

  if (chave !== ultimaChave) {
    ultimaChave = chave;

    recentes.unshift({
      hora: new Date(dados.recebido_em).toLocaleTimeString("pt-BR"),
      ...leitura,
    });

    if (recentes.length > 10) {
      recentes.pop();
    }

    renderizarRecentes();
  }
}

function renderizarRecentes() {
  const caixa = document.getElementById("recent-data");

  caixa.replaceChildren();

  const linhas = [
    ["Hora", "Temp.", "Umid.", "Pressão", "Luz", "Ar"],
    ...recentes.map((leitura) => [
      leitura.hora,
      leitura.temperatura,
      leitura.umidade,
      leitura.pressao,
      leitura.luz,
      leitura.ar,
    ]),
  ];

  for (const valores of linhas) {
    const linha = document.createElement("div");
    linha.className = "data-row";

    for (const valor of valores) {
      const celula = document.createElement("span");
      celula.textContent = valor;
      linha.appendChild(celula);
    }

    caixa.appendChild(linha);
  }
}

async function atualizar() {
  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), 4000);

  try {
    const resposta = await fetch(`${API_BASE}/api/leituras/ultima`, {
      cache: "no-store",
      signal: controlador.signal,
    });

    if (resposta.status === 404) {
      mostrarStatus("Aguardando", "Ainda não existem leituras armazenadas.");
      return;
    }

    if (!resposta.ok) {
      throw new Error(`Resposta HTTP ${resposta.status}`);
    }

    const dados = await resposta.json();
    renderizar(dados);
  } catch (erro) {
    console.error("Falha ao consultar o backend:", erro);

    mostrarStatus(
      "Offline",
      "Falha na consulta. Valores anteriores, se houver, foram mantidos.",
    );
  } finally {
    clearTimeout(limite);

    // Aguarda a conclusão antes de agendar a próxima consulta.
    setTimeout(atualizar, INTERVALO_MS);
  }
}

atualizar();
