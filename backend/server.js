const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const PDFDocument = require("pdfkit");

const app = express();

app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, "../frontend")));

const DB_FILE = path.join(__dirname, "db.json");

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    return {
      usuarios: [],
      pacientes: [],
      triagens: [],
      consultas: [],
      altas: [],
      tv_chamada: null,
      tv_historico: []
    };
  }

  const db = JSON.parse(fs.readFileSync(DB_FILE));

  if (!db.tv_chamada) db.tv_chamada = null;
  if (!db.tv_historico) db.tv_historico = [];
  if (!db.altas) db.altas = [];

  return db;
}

function writeDB(data) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(data, null, 2)
  );
}


// =====================================================
// LOGIN
// =====================================================

app.post("/login", (req, res) => {

  const db = readDB();

  const user = db.usuarios.find(u =>
    u.usuario === req.body.usuario &&
    u.senha === req.body.senha
  );

  if (!user) {
    return res.status(401).json({
      erro: "Login inválido"
    });
  }

  res.json(user);
});


// =====================================================
// ATENDIMENTO - CADASTRAR PACIENTE
// =====================================================

app.post("/atendimento", (req, res) => {

  const db = readDB();

  const paciente = {

    id: Date.now(),

    nome: req.body.nome,

    cpf: req.body.cpf,

    tipo: req.body.tipo,

    status: "triagem",

    createdAt: new Date()

  };

  db.pacientes.push(paciente);

  writeDB(db);

  res.json(paciente);
});


// =====================================================
// LISTAR PACIENTES
// =====================================================

app.get("/pacientes", (req, res) => {

  const db = readDB();

  res.json(db.pacientes);

});


// =====================================================
// TRIAGEM
// =====================================================

app.post("/triagem", (req, res) => {

  const db = readDB();

  let risco = req.body.risco;

  if (req.body.temperatura >= 39) {

    risco = "vermelho";

  } else if (req.body.temperatura >= 38) {

    risco = "amarelo";

  } else if (!risco) {

    risco = "verde";

  }

  const triagem = {

    id: Date.now(),

    nome: req.body.nome,

    sintoma: req.body.sintoma,

    temperatura: req.body.temperatura,

    alergia: req.body.alergia,

    observacao: req.body.observacao,

    risco: risco,

    status: "aguardando_medico",

    createdAt: new Date()

  };

  db.triagens.push(triagem);

  writeDB(db);

  res.json(triagem);

});


// =====================================================
// LISTAR TRIAGENS
// =====================================================

app.get("/triagens", (req, res) => {

  const db = readDB();

  res.json(db.triagens);

});


// =====================================================
// MÍDIA INDOOR - TV
// =====================================================

app.post("/tv/chamar", (req, res) => {

  const db = readDB();

  const chamada = {

    id: Date.now().toString(),

    localTipo: req.body.localTipo,

    localNumero: req.body.localNumero,

    paciente: req.body.paciente,

    hora: new Date().toLocaleTimeString(
      "pt-BR",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    )

  };

  db.tv_chamada = chamada;

  db.tv_historico.unshift(chamada);

  if (db.tv_historico.length > 5) {

    db.tv_historico.pop();

  }

  writeDB(db);

  res.json(chamada);

});


// =====================================================
// CONSULTAR CHAMADA DA TV
// =====================================================

app.get("/tv/chamada", (req, res) => {

  const db = readDB();

  res.json({

    chamada: db.tv_chamada,

    historico: db.tv_historico

  });

});


// =====================================================
// LISTA DE MEDICAÇÕES
// =====================================================

app.get("/lista-medicacoes", (req, res) => {

  res.json([

    "Dipirona",

    "Paracetamol",

    "Ibuprofeno",

    "Amoxicilina",

    "Azitromicina",

    "Loratadina",

    "Omeprazol",

    "Buscopan",

    "Dramin",

    "Soro fisiológico"

  ]);

});


// =====================================================
// CONSULTA
// =====================================================

app.post("/consulta", (req, res) => {

  const db = readDB();

  const consulta = {

    id: Date.now(),

    paciente: req.body.paciente,

    diagnostico: req.body.diagnostico,

    medicacao: req.body.medicacao,

    obs: req.body.obs,

    createdAt: new Date()

  };

  db.consultas.push(consulta);

  writeDB(db);

  res.json(consulta);

});


// =====================================================
// MEDICAÇÕES / CONSULTAS
// =====================================================

app.get("/medicacoes", (req, res) => {

  const db = readDB();

  res.json(db.consultas);

});


// =====================================================
// CONFIRMAR ALTA
// =====================================================

app.post("/alta", (req, res) => {

  const db = readDB();

  const alta = {

    id: Date.now(),

    paciente: req.body.paciente,

    diagnostico: req.body.diagnostico,

    orientacoes: req.body.orientacoes,

    retorno: req.body.retorno,

    obs: req.body.obs,

    createdAt: new Date()

  };

  if (!db.altas) {

    db.altas = [];

  }

  db.altas.push(alta);

  writeDB(db);

  res.json(alta);

});


// =====================================================
// LISTAR ALTAS
// =====================================================

app.get("/altas", (req, res) => {

  const db = readDB();

  res.json(db.altas);

});


// =====================================================
// GERAR PDF DA ALTA
// =====================================================

app.get("/gerar-pdf-alta", (req, res) => {

  const paciente =
    req.query.paciente || "";

  const diagnostico =
    req.query.diagnostico || "";

  const orientacoes =
    req.query.orientacoes || "";

  const retorno =
    req.query.retorno || "";

  const obs =
    req.query.obs || "";


  const doc = new PDFDocument({

    size: "A4",

    margin: 50

  });


  // ===================================================
  // CONFIGURAÇÃO DO DOWNLOAD
  // ===================================================

  const nomeArquivo =
    paciente
      .replace(/[^a-zA-Z0-9À-ÿ]/g, "_")
      .replace(/_+/g, "_");


  res.setHeader(

    "Content-Disposition",

    `attachment; filename="alta-${nomeArquivo || "paciente"}.pdf"`

  );


  res.setHeader(

    "Content-Type",

    "application/pdf"

  );


  doc.pipe(res);


  // ===================================================
  // CABEÇALHO
  // ===================================================

  doc
    .fontSize(20)
    .font("Helvetica-Bold")
    .text(
      "HOSPITAL PRO",
      {
        align: "center"
      }
    );


  doc.moveDown();


  doc
    .fontSize(16)
    .text(
      "ALTA DO PACIENTE",
      {
        align: "center"
      }
    );


  doc.moveDown(2);


  // ===================================================
  // DATA
  // ===================================================

  doc
    .fontSize(11)
    .font("Helvetica")
    .text(
      "Data da alta: " +
      new Date().toLocaleDateString("pt-BR")
    );


  doc.moveDown();


  // ===================================================
  // PACIENTE
  // ===================================================

  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("Paciente:");


  doc
    .font("Helvetica")
    .text(
      paciente || "Não informado."
    );


  doc.moveDown();


  // ===================================================
  // DIAGNÓSTICO
  // ===================================================

  doc
    .font("Helvetica-Bold")
    .text(
      "Diagnóstico / Motivo da Alta:"
    );


  doc
    .font("Helvetica")
    .text(
      diagnostico || "Não informado."
    );


  doc.moveDown();


  // ===================================================
  // ORIENTAÇÕES
  // ===================================================

  doc
    .font("Helvetica-Bold")
    .text(
      "Orientações ao paciente:"
    );


  doc
    .font("Helvetica")
    .text(
      orientacoes || "Não informado."
    );


  doc.moveDown();


  // ===================================================
  // RETORNO
  // ===================================================

  doc
    .font("Helvetica-Bold")
    .text(
      "Retorno:"
    );


  doc
    .font("Helvetica")
    .text(
      retorno || "Não informado."
    );


  doc.moveDown();


  // ===================================================
  // OBSERVAÇÕES
  // ===================================================

  doc
    .font("Helvetica-Bold")
    .text(
      "Observações:"
    );


  doc
    .font("Helvetica")
    .text(
      obs || "Nenhuma observação."
    );


  doc.moveDown(4);


  // ===================================================
  // ASSINATURA
  // ===================================================

  doc
    .font("Helvetica")
    .text(
      "________________________________________",
      {
        align: "center"
      }
    );


  doc
    .text(
      "Assinatura do responsável",
      {
        align: "center"
      }
    );


  // ===================================================
  // FINALIZAR PDF
  // ===================================================

  doc.end();

});


// =====================================================
// START
// =====================================================

app.listen(3000, () => {

  console.log(
    "🏥 Hospital Pro rodando em http://localhost:3000"
  );

});
