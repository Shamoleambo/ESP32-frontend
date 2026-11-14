# Estação Meteorológica IoT — Dashboard Web

**Vídeo de demonstração:** inserir link do vídeo.

**Dashboard publicado:** https://estacao-meteorologica-front.onrender.com

## Sobre o projeto

Interface web de uma estação meteorológica acadêmica desenvolvida com ESP32.

O dashboard apresenta dados ambientais disponibilizados por uma API Python e permite visualizar a localização cadastrada da estação em um mapa.

O projeto aplica conceitos de Internet das Coisas, Cidades Inteligentes e Geometria Analítica.

## Funcionalidades

- Exibição de temperatura e umidade do DHT22.
- Exibição de pressão atmosférica do BMP280.
- Exibição do sinal ADC bruto do MQ-135.
- Exibição da luminosidade digital do LDR.
- Indicação de falhas individuais dos sensores.
- Indicação de indisponibilidade da API.
- Aviso de dados antigos.
- Lista das dez últimas leituras distintas observadas na sessão.
- Mapa com a localização cadastrada da estação.
- Geolocalização do usuário mediante autorização.
- Vetor até a estação e distância direta aproximada.

A lista recente é mantida apenas na memória do navegador e desaparece ao recarregar a página. Ela não consulta o histórico completo do banco.

Não estão implementados gráficos históricos ou alertas meteorológicos por limites críticos.

## Tecnologias

- HTML.
- CSS.
- JavaScript puro.
- Leaflet 1.9.4.
- Tiles do OpenStreetMap.
- Fonte Inter, carregada pelo Google Fonts.

Não há framework de interface, instalação por npm ou etapa de compilação.

## Arquitetura

O navegador consulta a API Flask. Não há conexão direta entre o frontend e o ESP32.

O fluxo completo é:

1. O ESP32 coleta e publica os dados por MQTT.
2. O consumidor Python recebe e valida as mensagens.
3. As leituras são armazenadas no SQLite.
4. A API Flask consulta o banco.
5. O frontend solicita e apresenta os dados.

## Estrutura

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html` | Estrutura e carregamento dos scripts |
| `style.css` | Estilos da interface |
| `script.js` | Consulta e apresentação das leituras |
| `mapa.js` | Consulta da estação e inicialização do mapa |
| `vetor.js` | Geolocalização, distância e vetor |

## Executar localmente

Python 3 é utilizado apenas para servir os arquivos estáticos.

```bash
git clone https://github.com/Shamoleambo/ESP32-frontend.git
cd ESP32-frontend

python3 -m http.server 8000 --bind 127.0.0.1
```

Abrir:

```text
http://127.0.0.1:8000
```

O frontend atual consulta o backend publicado. Não é necessário iniciar o backend local para utilizar essa configuração.

## Configurar o backend

O endereço é definido em `script.js`.

### API publicada

```javascript
const API_BASE = "https://estacao-meteorologica-backend-k3q0.onrender.com";
```

### API local

Para desenvolver com o backend local:

```javascript
const API_BASE = "http://127.0.0.1:5000";
```

Manter somente uma declaração ativa de `API_BASE`, sem barra no final.

Ao utilizar a API local, iniciar o consumidor e a API conforme o README do backend.

O frontend publicado não deve apontar para `localhost`, pois esse endereço corresponde ao computador de quem abre o site.

## Endpoints utilizados

| Método | Rota | Uso |
| --- | --- | --- |
| GET | `/api/leituras/ultima` | Valores e estados dos sensores |
| GET | `/api/estacao` | Nome e coordenadas da estação |

## Atualização dos dados

Uma nova consulta é agendada dois segundos após a conclusão da tentativa anterior.

O timeout da consulta de leituras é de quatro segundos.

Quando o horário `recebido_em` indica uma leitura com mais de 15 segundos, a interface apresenta o aviso de dados antigos.

Em falhas de comunicação, valores anteriores podem permanecer visíveis, acompanhados da indicação de indisponibilidade.

O estado online se refere à disponibilidade recente dos dados recebidos, não a uma medição direta do sinal Wi-Fi do ESP32.

## Interpretação das leituras

| Informação | Unidade ou significado |
| --- | --- |
| Temperatura | Graus Celsius |
| Umidade relativa | Porcentagem |
| Pressão atmosférica | hPa |
| MQ-135 | ADC bruto de 0 a 4095 |
| Luminosidade | Resultado digital 0 ou 1 |

### MQ-135

O valor exibido é uma contagem bruta do conversor analógico-digital.

Não representa concentração em ppm, índice certificado de qualidade do ar ou diagnóstico de segurança ambiental.

### LDR

Na montagem testada:

| Valor | Interpretação utilizada |
| --- | --- |
| 0 | Acima do limiar de luminosidade |
| 1 | Abaixo do limiar de luminosidade |

O limiar é ajustado no módulo.

O sensor não mede lux e não identifica dia ou noite de forma confiável. Cobertura, sombra e ajuste do potenciômetro influenciam o resultado.

### Falhas de sensores

Quando o sensor não possui estado `ok` ou valor válido, a medição é substituída por um traço.

A falha de um sensor não deve impedir a apresentação dos demais.

## Mapa

O mapa utiliza Leaflet e tiles do OpenStreetMap, mantendo a atribuição do provedor.

A posição da estação é obtida em:

```text
GET /api/estacao
```

As coordenadas são cadastradas manualmente no backend. O ESP32 não utiliza GPS nesta implementação.

A interface valida os limites de latitude e longitude antes de inicializar o mapa.

Se a API de localização ou a biblioteca estiver indisponível, uma mensagem substitui o mapa.

## Vetor até a estação

O botão **Mostrar vetor até a estação** solicita acesso à localização do usuário.

São necessários:

- Navegador compatível.
- Permissão de localização.
- Contexto seguro, normalmente HTTPS na publicação.
- Coordenadas válidas da estação.

Após a autorização, são exibidos:

- Marcador da posição aproximada do usuário.
- Círculo de precisão informado pelo navegador.
- Segmento e seta até a estação.
- Distância direta aproximada.
- Componentes locais aproximadas, quando aplicáveis.

A seta representa usuário → estação. Não é uma rota por ruas.

A posição do usuário não é enviada à API do projeto pelo código do vetor.

## Geometria Analítica

A distância direta utiliza o método `mapa.distance`.

Para deslocamentos de até 50 km, também são apresentadas componentes aproximadas em um plano local:

```text
leste = R × Δlongitude × cos(latitude média)

norte = R × Δlatitude

R = 6.371.000 metros
Ângulos em radianos
```

As componentes indicam deslocamentos nos sentidos leste e norte.

A orientação visual da seta utiliza as coordenadas projetadas pelo mapa e é atualizada ao mover ou ampliar a visualização.

A precisão depende da localização fornecida pelo navegador. Para posições praticamente coincidentes, a interface informa que não há direção definida.

## CORS

O backend deve permitir a origem exata do frontend.

Estas são origens diferentes:

```text
http://127.0.0.1:8000
http://localhost:8000
```

Ao publicar o site em outro domínio, atualizar as origens permitidas no Flask.

Um HTTP 200 registrado no backend não garante que o navegador tenha acesso à resposta: ela ainda pode ser bloqueada pelo CORS.

## Publicação no Render

O frontend é publicado como **Static Site**.

| Configuração | Valor |
| --- | --- |
| Repositório | `Shamoleambo/ESP32-frontend` |
| Branch | Branch escolhida para publicação |
| Root Directory | Em branco |
| Build Command | `echo "Frontend sem etapa de build"` |
| Publish Directory | `.` |

Antes de publicar:

1. Configurar `API_BASE` com a URL HTTPS do backend.
2. Autorizar o domínio público do frontend no CORS da API.
3. Conferir os endpoints de leituras e localização.
4. Confirmar o carregamento de CSS e JavaScript.

Atualizações automáticas dependem da branch vinculada ao serviço e da configuração de deploy automático.

O frontend não precisa de banco de dados, disco persistente ou consumidor MQTT próprios.

## Testes recomendados

1. Carregamento dos arquivos sem erros 404.
2. Resposta da API e atualização das leituras.
3. Avanço do campo `recebido_em`.
4. Exibição independente dos sensores.
5. Aviso de dados antigos após interrupção das publicações.
6. Indicação offline quando a API fica indisponível.
7. Posição do marcador correspondente às coordenadas cadastradas.
8. Geolocalização autorizada e vetor até a estação.
9. Recusa da permissão de localização.
10. Comportamento em tela de celular.

Registrar evidências e resultados reais para cada teste.

## Solução de problemas

### As leituras não aparecem

- Conferir `API_BASE`.
- Consultar `/api/leituras/ultima` no Postman.
- Verificar se o consumidor está recebendo mensagens.
- Conferir Console e Network do navegador.
- Verificar CORS.

### A API retorna 404 na última leitura

O banco ainda não possui registros. Conferir a publicação do ESP32 e o funcionamento do consumidor.

### O mapa não aparece

- Conferir `/api/estacao`.
- Verificar as variáveis de localização no backend.
- Conferir acesso à internet e carregamento do Leaflet.

### A localização do usuário não funciona

- Conferir a permissão de localização.
- Abrir o site publicado por HTTPS.
- Verificar se a localização está disponível no dispositivo.
- Tentar novamente, preferencialmente em um celular.

## Limitações

- Leituras recentes mantidas apenas durante a sessão.
- Sem consulta ao histórico completo do banco.
- Sem gráficos históricos.
- Sem alertas meteorológicos por limites críticos.
- Coordenadas da estação cadastradas manualmente.
- Dependência de serviços externos para mapa e fonte.
- Distância exibida não corresponde a percurso viário.

## Documentação visual

Acrescentar ao repositório:

- Captura do dashboard com leituras reais.
- GIF da atualização dos dados.
- Captura do mapa da estação.
- GIF do vetor após autorização da localização.
- Link do vídeo técnico no topo deste README.

Evitar capturas que exponham localização pessoal sem necessidade.

## Repositórios relacionados

- Firmware: https://github.com/Shamoleambo/ESP32
- Backend: https://github.com/Shamoleambo/ESP32-backend
- Frontend: https://github.com/Shamoleambo/ESP32-frontend
