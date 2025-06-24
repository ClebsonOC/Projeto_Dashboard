// server.js
const express = require("express");
const session = require("express-session");
const path = require("path");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "seu_segredo_de_sessao_muito_forte_e_unico_altere_isso_agora",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

const users = [
    { id: 1, username: "debora", password: "7946130", orgao: "ADMINISTRATIVO", gerente: "TODOS" },
    { id: 2, username: "luciana", password: "8523", orgao: "FINANCEIRO", gerente: "TODOS" },
    { id: 3, username: "filippy", password: "7896", orgao: "REGIAO METROPOLITANA 2", gerente: "FILLIPE" },
    { id: 4, username: "octavio", password: "1254", orgao: "REGIAO METROPOLITANA 3", gerente: "OCTAVIO" },
    { id: 5, username: "erisangela", password: "1452", orgao: "REGIAO METROPOLITANA 1", gerente: "ERISANGELA" },
    { id: 6, username: "juridico", password: "9647", orgao: "FINANCEIRO", gerente: "TODOS" }
];

function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect("/login");
}

// --- Rotas e Assets Públicos ---
// (Não precisam de login para serem acessados)

app.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/");
  }
  res.sendFile(path.join(__dirname, "login.html"));
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (user) {
    req.session.user = { id: user.id, username: user.username, orgao: user.orgao, gerente: user.gerente };
    let redirectTo = "/";
    if (user.orgao && user.orgao.toUpperCase() !== "ADMINISTRATIVO") {
      redirectTo = "/#financeiro";
    }
    res.json({ success: true, message: "Login bem-sucedido!", redirectTo });
  } else {
    res.status(401).json({ success: false, message: "Usuário ou senha inválidos." });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
});

// Servir assets estáticos PÚBLICOS
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/src", express.static(path.join(__dirname, "src"))); // <-- LINHA MOVIDA PARA CIMA. AGORA É PÚBLICA.


// --- Middleware de Autenticação ---
// TUDO ABAIXO DESTA LINHA EXIGIRÁ LOGIN
app.use(isAuthenticated);


// --- Rotas e Assets Protegidos ---

app.get('/api/userinfo', (req, res) => {
  res.json({
    username: req.session.user.username,
    orgao: req.session.user.orgao,
    gerente: req.session.user.gerente,
  });
});

app.get('/api/financeiro-data', async (req, res) => {
    // ...toda a sua lógica da API do financeiro continua aqui, sem alterações...
    const googleSheetTsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQE41LdNq9qQTcY5Ze6MJ3Bi3CAn8o9OI6ixrFseQZgsfItqyjrIFi75GjMMUjS6KwLYC3qX3xRKher/pub?gid=1589437429&single=true&output=tsv";
    try {
        const sheetResponse = await fetch(googleSheetTsvUrl);
        if (!sheetResponse.ok) throw new Error(`Erro ao buscar TSV da planilha: ${sheetResponse.statusText}`);
        const tsvText = await sheetResponse.text();
        const lines = tsvText.trim().split('\n');
        if (lines.length < 1) return res.type('text/tab-separated-values').send('');
        const headerRow = lines[0].split('\t').map(h => h.trim());
        const gerenteColumnNameFromSheet = "GERENTE";
        const gerenteColumnIndex = headerRow.findIndex(header => header.toUpperCase() === gerenteColumnNameFromSheet.toUpperCase());
        const orgaoColumnIndex = headerRow.findIndex(header => 
            header.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() === "ORGAO"
        );
        let dataRowsAsArrays = lines.slice(1).map(line => line.split('\t').map(cell => cell.trim()));
        const userOrgaoUpper = req.session.user.orgao ? req.session.user.orgao.toUpperCase() : "";
        const userGerenteUpper = req.session.user.gerente ? req.session.user.gerente.toUpperCase() : "";
        let filteredDataRows;
        if (userOrgaoUpper === "ADMINISTRATIVO" || userOrgaoUpper === "FINANCEIRO" || (userOrgaoUpper.startsWith("REGIAO METROPOLITANA") && userGerenteUpper === "TODOS")) {
            filteredDataRows = dataRowsAsArrays;
        } else {
            if (gerenteColumnIndex === -1) {
                console.warn(`Coluna "${gerenteColumnNameFromSheet}" não encontrada. Usuário ${req.session.user.username} não verá dados.`);
                filteredDataRows = [];
            } else if (!req.session.user.gerente) {
                console.warn(`Usuário ${req.session.user.username} (${userOrgaoUpper}) não tem 'gerente' definido. Não verá dados.`);
                filteredDataRows = [];
            } else {
                filteredDataRows = dataRowsAsArrays.filter(rowArray => {
                    const gerenteNaPlanilha = rowArray[gerenteColumnIndex];
                    return gerenteNaPlanilha && gerenteNaPlanilha.trim().toUpperCase() === userGerenteUpper;
                });
            }
        }
        if (orgaoColumnIndex !== -1) {
            filteredDataRows.sort((a, b) => {
                const orgaoA = a[orgaoColumnIndex] || '';
                const orgaoB = b[orgaoColumnIndex] || '';
                return orgaoA.localeCompare(orgaoB);
            });
        } else {
            console.warn('A coluna "ORGAO" não foi encontrada. Os dados não serão ordenados.');
        }
        const outputHeader = headerRow.join('\t');
        const outputData = filteredDataRows.map(rowArray => 
            headerRow.map((header, index) => rowArray[index] || '').join('\t')
        );
        const outputTsv = [outputHeader, ...outputData].join('\n');
        res.type('text/tab-separated-values');
        res.send(outputTsv);
    } catch (error) {
        console.error("Erro no endpoint /api/financeiro-data:", error);
        res.status(500).send("Erro ao buscar dados financeiros.");
    }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Servir a pasta de páginas estáticas protegidas
app.use("/pages", express.static(path.join(__dirname, "pages")));

app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));