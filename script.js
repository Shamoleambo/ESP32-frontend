// Config para ambiente local, terá que mudar isso no deploy

const API_BASE = "http://127.0.0.1:5000";

const INTERVALO_CONSULTA_MS = 2000;
const LIMITE_LEITURA_ANTIGA_MS = 15000;

const temperatura = document.querySelector("#temperatura");
const umidade = document.querySelector("#umidade");
const horario = document.querySelector("#horario");
const estacao = document.querySelector("#estacao");
const status = document.querySelector("#status");

const formatoNumero = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

let ultimaDataRecebida = null;

function mostrarStatus(texto, estado) {
  status.textContent = texto;
  status.dataset.estado = estado;
}

function limparMedicoes() {
  temperatura.textContent = "—";
  umidade.textContent = "—";
  horario.textContent = "—";
  horario.removeAttribute("datetime");
  estacao.textContent = "Aguardando identificação da estação.";
  ultimaDataRecebida = null;
}

function avaliarAtualizacao() {
  if (ultimaDataRecebida === null) {
    return;
  }

  const idade = Date.now() - ultimaDataRecebida.getTime();

  if (idade > LIMITE_LEITURA_ANTIGA_MS) {
    mostrarStatus(
      "Dados antigos: nenhuma nova leitura recebida há mais de 15 segundos.",
      "aviso",
    );
  } else {
    mostrarStatus("Leitura recebida recentemente.", "ok");
  }
}

async function atualizarLeitura() {
  // O que faz esse AbortController?
  const controlador = new AbortController();
  const tempoLimite = setTimeout(() => controlador.abort(), 4000);

  try {
    const resposta = await fetch(`${API_BASE}/api/leituras/ultima`, {
      signal: controlador.signal,
      cache: "no-store",
    });

    if (resposta.status === 404) {
      limparMedicoes();
      mostrarStatus("Ainda não existem leituras válidas armazenadas.", "aviso");
      return;
    }

    if (!resposta.ok) {
      throw new Error(`Resposta HTTP ${resposta.status}`);
    }

    const dados = await resposta.json();

    const valorTemperatura = dados.leituras?.temperatura_c;
    const valorUmidade = dados.leituras?.umidade_pct;
    const dataRecebimento = new Date(dados.recebido_em);

    if (
      !Number.isFinite(valorTemperatura) ||
      !Number.isFinite(valorUmidade) ||
      Number.isNaN(dataRecebimento.getTime()) ||
      typeof dados.estacao_id !== "string"
    ) {
      throw new Error("Formato de resposta inesperado.");
    }

    temperatura.textContent = formatoNumero.format(valorTemperatura);
    umidade.textContent = formatoNumero.format(valorUmidade);
    estacao.textContent = `Identificação: ${dados.estacao_id}`;

    horario.textContent = dataRecebimento.toLocaleString("pt-BR");
    horario.dateTime = dados.recebido_em;

    ultimaDataRecebida = dataRecebimento;
    avaliarAtualizacao();
  } catch (erro) {
    console.error("Falha ao consultar a leitura:", erro);

    mostrarStatus(
      ultimaDataRecebida
        ? "Falha ao consultar o backend. Valores da última consulta mantidos."
        : "Não foi possível consultar o backend. Tentando novamente…",
      "erro",
    );
  } finally {
    clearTimeout(tempoLimite);
  }
}

async function iniciarAtualizacao() {
  await atualizarLeitura();

  setTimeout(iniciarAtualizacao, INTERVALO_CONSULTA_MS);
}

iniciarAtualizacao();
