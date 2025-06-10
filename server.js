// server.js
const express = require("express");
const session = require("express-session");
const path = require("path");
const fetch = require("node-fetch"); // Certifique-se de ter: npm install node-fetch@2

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "seu_segredo_de_sessao_muito_forte_e_unico_altere_isso_agora", // TROQUE ISSO IMEDIATAMENTE!
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // Em produção, use true com HTTPS
  })
);

// Armazenamento de Usuários (Exemplo)
const users = [
  { id: 1, username: "debora", password: "7946130", orgao: "ADMINISTRATIVO", gerente: "TODOS" },
  { id: 2, username: "luciana", password: "8523", orgao: "FINANCEIRO", gerente: "TODOS" },
  { id: 3, username: "filippy", password: "7896", orgao: "REGIAO METROPOLITANA 2", gerente: "FILLIPE" }, // Filtrado por gerente
  { id: 4, username: "octavio", password: "1254", orgao: "REGIAO METROPOLITANA 3", gerente: "OCTAVIO" }, // Filtrado por gerente
  { id: 5, username: "erisangela", password: "1452", orgao: "REGIAO METROPOLITANA 1", gerente: "ERISANGELA" },
  { id: 6, username: "juridico", password: "9647", orgao: "FINANCEIRO", gerente: "TODOS" }
   // Exemplo de RM com acesso total aos dados
  // Adicione outros usuários conforme sua necessidade
];

// Middleware de Autenticação
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect("/login");
}

// --- Rotas Públicas ---
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
    req.session.user = {
      id: user.id,
      username: user.username,
      orgao: user.orgao,
      gerente: user.gerente,
    };
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
  req.session.destroy((err) => {
    if (err) {
      console.error("Erro ao destruir a sessão:", err);
      return res.status(500).send("Não foi possível fazer logout.");
    }
    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
});

// Servir assets públicos para a página de login
app.get("/css/login.css", (req, res) => res.sendFile(path.join(__dirname, "css", "login.css")));
app.get("/js/login.js", (req, res) => res.sendFile(path.join(__dirname, "js", "login.js")));
app.get("/css/style.css", (req, res) => res.sendFile(path.join(__dirname, "css", "style.css")));


// --- Middleware de Autenticação para TODAS as rotas e assets abaixo ---
app.use(isAuthenticated);

// --- Rotas Protegidas ---
app.get('/api/userinfo', (req, res) => {
  res.json({
    username: req.session.user.username,
    orgao: req.session.user.orgao,
    gerente: req.session.user.gerente,
  });
});

app.get('/api/financeiro-data', async (req, res) => {
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

    if (
        userOrgaoUpper === "ADMINISTRATIVO" ||
        userOrgaoUpper === "FINANCEIRO" ||
        (userOrgaoUpper.startsWith("REGIAO METROPOLITANA") && userGerenteUpper === "TODOS")
    ) {
        filteredDataRows = dataRowsAsArrays;
    } else {
        if (gerenteColumnIndex === -1) {
            console.warn(`Coluna "${gerenteColumnNameFromSheet}" não encontrada na planilha. Usuário ${req.session.user.username} não verá dados.`);
            filteredDataRows = [];
        } else if (!req.session.user.gerente) {
            console.warn(`Usuário ${req.session.user.username} (${userOrgaoUpper}) não tem 'gerente' definido para filtro. Não verá dados.`);
            filteredDataRows = [];
        } else {
            filteredDataRows = dataRowsAsArrays.filter(rowArray => {
                const gerenteNaPlanilha = rowArray[gerenteColumnIndex];
                return gerenteNaPlanilha && 
                       gerenteNaPlanilha.trim().toUpperCase() === userGerenteUpper;
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
        console.warn('A coluna "ORGAO" não foi encontrada no cabeçalho. Os dados não serão ordenados por órgão.');
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

// ✅ ROTA PRINCIPAL CORRIGIDA PARA APENAS SERVIR O ARQUIVO HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Servir arquivos estáticos protegidos
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/pages", express.static(path.join(__dirname, "pages")));

app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));