/**
 * SERVIÇO DE GERAÇÃO E ENVIO DO TERMO — Algar + Autentique
 * ------------------------------------------------------------------------
 * Usa o mapeamento de campos (UNIT_CONFIGS) exatamente como já validado no
 * seu formulário manual em HTML/pdf-lib, rodando aqui via HTTP para ser
 * chamado automaticamente pelo bloco de Integração do BotConversa.
 *
 * ATENÇÃO — IMPORTANTE:
 * Os arquivos em templates/divinopolis.pdf e templates/uberaba.pdf que estão
 * neste projeto agora são só placeholders (vieram de uma versão diferente
 * do Termo, com numeração de campo diferente — descobrimos isso durante os
 * testes: Button108/109 caíam na página 9, não na tabela de Banda Larga).
 * Antes de publicar de verdade, SUBSTITUA esses dois arquivos pelos PDFs
 * originais que você usou pra validar o mapeamento abaixo.
 *
 * ENDEREÇO: POST /gerar-termo
 * Corpo esperado (JSON):
 * {
 *   "unidade": "divinopolis" | "uberaba",
 *   "nome": "Nome do Cliente",
 *   "cpf": "000.000.000-00",
 *   "cidade": "Divinópolis",          // opcional, usa o default da unidade se não vier
 *   "tipoOferta": "combo" | "apenas_wifi",
 *   "velocidade": "600 MB",           // obrigatório só se tipoOferta = combo
 *   "tipoAbrangencia": "Franqueado",  // obrigatório só se tipoOferta = combo ("Franqueado" ou "Comodato")
 *   "valorTotal": "119,90"
 * }
 *
 * COMO RODAR LOCALMENTE (teste):
 *   npm install
 *   AUTENTIQUE_API_TOKEN=seu_token node server.js
 *   curl -X POST http://localhost:3000/gerar-termo -H "Content-Type: application/json" -d '{"unidade":"divinopolis","nome":"Maria Teste","cpf":"000.000.000-00","tipoOferta":"combo","velocidade":"600 MB","tipoAbrangencia":"Franqueado","valorTotal":"119,90"}'
 *
 * COMO HOSPEDAR (ex: Render.com):
 * 1. Substitua templates/divinopolis.pdf e templates/uberaba.pdf pelos seus PDFs corretos.
 * 2. Suba esta pasta inteira (server.js, package.json, templates/) num repositório Git.
 * 3. No Render: New > Web Service > conecta o repositório.
 * 4. Build command: npm install    |    Start command: node server.js
 * 5. Em "Environment", adicione a variável AUTENTIQUE_API_TOKEN com sua chave.
 * 6. Depois de publicado, você terá uma URL tipo https://seu-servico.onrender.com
 *    — é essa URL + /gerar-termo que vai no bloco de Integração do BotConversa.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

const app = express();
app.use(express.json());

const AUTENTIQUE_API_TOKEN = process.env.AUTENTIQUE_API_TOKEN || 'COLE_AQUI_SEU_TOKEN_DA_AUTENTIQUE';
const AUTENTIQUE_ENDPOINT = 'https://api.autentique.com.br/v2/graphql';

const UNIT_CONFIGS = {

  divinopolis: {
    templateFile: 'divinopolis.pdf',
    defaultCidade: 'DIVINÓPOLIS',
    defaultEstado: 'MG',
    hasTier: true,
    hasLocalData: true,
    FIELDS: {
      nome: 'Text2', cpf: 'Text4', cidade: 'Text15', estado: 'Text16',
      totalComBeneficio: 'Text130', localData: 'Text28',
      contratanteNome_1: 'Text26', contratanteCpf_1: 'Text27',
      contratanteNome_2: 'Text31', contratanteCpf_2: 'Text32',
      contratadaAlgar: 'Button36', cienteField: 'Button37'
    },
    declaracoesPadrao: ['Button47', 'Button42', 'Button41', 'Button40', 'Button39', 'Button38'],
    prazo12meses: 'Button34',
    bandaLarga: [
      { label: '300 MB Franqueado', produto: 'Button119', p1p: 'Button120', p2p: 'Button121' },
      { label: '400 MB Comodato', produto: 'Button118', p1p: 'Button117', p2p: 'Button116' },
      { label: '400 MB Franqueado', produto: 'Button114', p1p: 'Button115', p2p: 'Button113' },
      { label: '600 MB Comodato', produto: 'Button112', p1p: 'Button111', p2p: 'Button110' },
      { label: '600 MB Franqueado', produto: 'Button109', p1p: 'Button108', p2p: 'Button107' },
      { label: '700 MB Comodato', produto: 'Button106', p1p: 'Button105', p2p: 'Button104' },
      { label: '700 MB Franqueado', produto: 'Button103', p1p: 'Button101', p2p: 'Button102' },
      { label: '800 MB Comodato', produto: 'Button98', p1p: 'Button99', p2p: 'Button100' },
      { label: '800 MB Franqueado', produto: 'Button97', p1p: 'Button95', p2p: 'Button96' },
      { label: '1GB Comodato', produto: 'Button92', p1p: 'Button93', p2p: 'Button94' },
      { label: '1GB Franqueado', produto: 'Button89', p1p: 'Button90', p2p: 'Button91' },
    ],
    svas: [
      { label: 'Super Wi-Fi (1 equip.)', field: 'Button66' }, { label: 'Super Wi-Fi (2 equip.)', field: 'Button65' },
      { label: 'Super Wi-Fi (3 equip.)', field: 'Button64' }, { label: 'Super Wi-Fi (4 equip.)', field: 'Button63' },
    ],
  },

  uberaba: {
    templateFile: 'uberaba.pdf',
    defaultCidade: 'UBERABA',
    defaultEstado: 'MG',
    hasTier: false,
    hasLocalData: false,
    FIELDS: {
      nome: 'Text1', cpf: 'Text3', cidade: 'Text13', estado: 'Text14',
      totalComBeneficio: 'Text23', localData: null,
      contratanteNome_1: 'Text26', contratanteCpf_1: 'Text27',
      contratanteNome_2: 'Text30', contratanteCpf_2: 'Text32',
      contratadaAlgar: 'Button35', cienteField: 'Button36'
    },
    declaracoesPadrao: ['Button42', 'Button41', 'Button40', 'Button39', 'Button38', 'Button37'],
    prazo12meses: 'Button33',
    bandaLarga: [
      { label: '300 MB Franqueado', produto: 'Button110', preco: 'Button111' },
      { label: '400 MB Comodato', produto: 'Button108', preco: 'Button109' },
      { label: '400 MB Franqueado', produto: 'Button106', preco: 'Button107' },
      { label: '600 MB Comodato', produto: 'Button104', preco: 'Button105' },
      { label: '600 MB Franqueado', produto: 'Button102', preco: 'Button103' },
      { label: '700 MB Comodato', produto: 'Button100', preco: 'Button101' },
      { label: '700 MB Franqueado', produto: 'Button98', preco: 'Button99' },
      { label: '800 MB Comodato', produto: 'Button96', preco: 'Button97' },
      { label: '800 MB Franqueado', produto: 'Button94', preco: 'Button95' },
      { label: '1GB Comodato', produto: 'Button92', preco: 'Button93' },
      { label: '1GB Franqueado', produto: 'Button90', preco: 'Button91' },
    ],
    svas: [
      { label: 'Super Wi-Fi (1 equip.)', field: 'Button69' }, { label: 'Super Wi-Fi (2 equip.)', field: 'Button68' },
      { label: 'Super Wi-Fi (3 equip.)', field: 'Button67' }, { label: 'Super Wi-Fi (4 equip.)', field: 'Button66' },
    ],
  },

};

function safeSetText(form, fieldId, value, avisos) {
  if (!fieldId || !value) return;
  try { form.getTextField(fieldId).setText(String(value)); }
  catch (e) { avisos.push('Campo de texto não encontrado: ' + fieldId); }
}

function safeCheck(form, fieldId, avisos) {
  if (!fieldId) return;
  try { form.getCheckBox(fieldId).check(); }
  catch (e) { avisos.push('Checkbox não encontrado: ' + fieldId); }
}

async function gerarPdfPreenchido(dados) {
  const cfg = UNIT_CONFIGS[dados.unidade];
  if (!cfg) throw new Error('Unidade desconhecida: ' + dados.unidade);

  const templatePath = path.join(__dirname, 'templates', cfg.templateFile);
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();
  const F = cfg.FIELDS;
  const avisos = [];

  safeSetText(form, F.nome, dados.nome, avisos);
  safeSetText(form, F.cpf, dados.cpf, avisos);
  safeSetText(form, F.cidade, dados.cidade || cfg.defaultCidade, avisos);
  safeSetText(form, F.estado, cfg.defaultEstado, avisos);
  safeSetText(form, F.totalComBeneficio, dados.valorTotal, avisos);
  if (cfg.hasLocalData) {
    const dataFormatada = new Date().toLocaleDateString('pt-BR');
    safeSetText(form, F.localData, (dados.cidade || cfg.defaultCidade) + ', ' + dataFormatada, avisos);
  }

  safeSetText(form, F.contratanteNome_1, dados.nome, avisos);
  safeSetText(form, F.contratanteCpf_1, dados.cpf, avisos);
  safeSetText(form, F.contratanteNome_2, dados.nome, avisos);
  safeSetText(form, F.contratanteCpf_2, dados.cpf, avisos);

  safeCheck(form, F.contratadaAlgar, avisos);
  safeCheck(form, F.cienteField, avisos);
  safeCheck(form, cfg.prazo12meses, avisos);
  cfg.declaracoesPadrao.forEach(f => safeCheck(form, f, avisos));

  if (dados.tipoOferta === 'combo') {
    const label = dados.velocidade + ' ' + dados.tipoAbrangencia;
    const item = cfg.bandaLarga.find(b => b.label === label);
    if (!item) throw new Error('Combinação de plano não encontrada: ' + label);
    safeCheck(form, item.produto, avisos);
    if (cfg.hasTier) {
      safeCheck(form, item.p1p, avisos);
    } else {
      safeCheck(form, item.preco, avisos);
    }
  }
  const superWifiItem = cfg.svas.find(s => s.label.startsWith('Super Wi-Fi (1'));
  if (superWifiItem) safeCheck(form, superWifiItem.field, avisos);

  const pdfBytes = await pdfDoc.save();
  return { pdfBytes, avisos };
}

async function enviarParaAutentique(pdfBytes, nomeCliente) {
  const query = `mutation CreateDocumentMutation($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
    createDocument(document: $document, signers: $signers, file: $file) {
      id
      signatures { public_id name link { short_link } }
    }
  }`;

  const variables = {
    document: { name: 'Termo de Atualização - ' + nomeCliente },
    signers: [{ name: nomeCliente, action: 'SIGN' }],
    file: null
  };

  const form = new FormData();
  form.append('operations', JSON.stringify({ query, variables }));
  form.append('map', JSON.stringify({ file: ['variables.file'] }));
  form.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), 'termo.pdf');

  const response = await fetch(AUTENTIQUE_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + AUTENTIQUE_API_TOKEN },
    body: form
  });

  const resultado = await response.json();
  if (resultado.errors) {
    throw new Error('Autentique retornou erro: ' + JSON.stringify(resultado.errors));
  }
  const assinaturas = resultado.data.createDocument.signatures;
  // A Autentique pode devolver mais de uma assinatura (ex: signatário automático
  // da conta/organização). Busca especificamente a que tem link de verdade.
  const assinaturaComLink = (assinaturas || []).find(s => s.link && s.link.short_link);
  if (!assinaturaComLink) {
    throw new Error('Não foi possível obter o link de assinatura da Autentique. Resposta bruta: ' + JSON.stringify(resultado));
  }
  return {
    link_termo: assinaturaComLink.link.short_link,
    documento_id: resultado.data.createDocument.id
  };
}

app.post('/gerar-termo', async (req, res) => {
  try {
    const dados = req.body;
    if (!dados.unidade || !dados.nome || !dados.cpf || !dados.tipoOferta || !dados.valorTotal) {
      return res.status(400).json({ erro: 'Campos obrigatórios ausentes: unidade, nome, cpf, tipoOferta, valorTotal.' });
    }
    const { pdfBytes, avisos } = await gerarPdfPreenchido(dados);

    // Modo de teste: adicione "modoTeste": true no corpo da requisição pra
    // só ver o diagnóstico de campos, sem gastar documento na Autentique.
    if (dados.modoTeste) {
      return res.json({
        modo: 'teste — nada foi enviado pra Autentique',
        campos_com_problema: avisos,
        total_avisos: avisos.length
      });
    }

    const resultado = await enviarParaAutentique(pdfBytes, dados.nome);
    resultado.avisos_preenchimento = avisos; // mesmo no modo real, mostra o que falhou (se algo falhou)
    res.json(resultado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message, transferir_humano: true });
  }
});

app.get('/', (req, res) => res.send('Serviço de geração de Termo Algar + Autentique no ar.'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor rodando na porta ' + PORT));
