let db;
let idUsuarioAtual = null; // Variável para armazenar o ID do usuário logado

// Carrega a biblioteca SQL.js
async function initSQL() {
    return await window.initSqlJs({
        locateFile: filename => `https://cdn.jsdelivr.net/npm/sql.js@1.6.2/dist/${filename}`
    });
}

async function criarNovoBanco(SQL) {
    db = new SQL.Database();
    db.run("CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, senha TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS despesas (id_usuario INTEGER, descricao TEXT, data_hora TEXT, valor REAL, tipo TEXT)"); // Criação da tabela despesas

    // Salva o banco de dados no localStorage
    salvarBancoNoLocalStorage();
}

function salvarBancoNoLocalStorage() {
    const dados = db.export();
    const dadosBase64 = btoa(String.fromCharCode.apply(null, dados));
    localStorage.setItem('meu_banco.sqlite', dadosBase64);
}

async function carregarBanco(SQL) {
    const dadosBase64 = localStorage.getItem('meu_banco.sqlite');
    if (dadosBase64) {
        const dados = new Uint8Array(atob(dadosBase64).split("").map(char => char.charCodeAt(0)));
        db = new SQL.Database(dados);
    } else {
        await criarNovoBanco(SQL);
    }
}

async function registrarUsuario(email, senha) {
    const stmt = db.prepare("SELECT * FROM usuarios WHERE email = ?");
    stmt.bind([email]);

    if (stmt.step()) {
        stmt.free();
        return false; // O email já existe
    }

    stmt.free();

    const senhaHash = btoa(senha); // Criptografia simples da senha
    const insertStmt = db.prepare("INSERT INTO usuarios (email, senha) VALUES (?, ?)");
    insertStmt.run([email, senhaHash]);
    insertStmt.free();

    // Salva o banco de dados após o registro
    salvarBancoNoLocalStorage();

    return true; // Registro bem-sucedido
}

async function loginUsuario(email, senha) {
    const stmt = db.prepare("SELECT * FROM usuarios WHERE email = ?");
    stmt.bind([email]);

    if (stmt.step()) {
        const usuario = stmt.getAsObject();
        const senhaHash = btoa(senha);
        if (usuario.senha === senhaHash) {
            idUsuarioAtual = usuario.id; // Armazena o ID do usuário logado
            
            // Armazena o idUsuarioAtual no localStorage
            localStorage.setItem('id_usuario', idUsuarioAtual);

            return true; // Login bem-sucedido
        }
    }
    return false; // Login falhou
}

// Evento de carregamento
window.onload = async function() {
    const SQL = await initSQL();
    await carregarBanco(SQL);
};

// Evento de registro
document.getElementById('registro-form').addEventListener('submit', async function(event) {
    event.preventDefault(); // Previne o envio padrão do formulário

    const email = this.email.value; // Captura o email
    const senha = this.senha.value; // Captura a senha

    if (await registrarUsuario(email, senha)) {
        alert("Registro realizado com sucesso!");
    } else {
        alert("Email já existe.");
    }

    // Limpa os campos de entrada do formulário de registro
    this.email.value = '';
    this.senha.value = '';
});

// Evento de login
document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault(); // Previne o envio padrão do formulário

    const email = this.email.value; // Captura o email
    const senha = this.senha.value; // Captura a senha

    if (await loginUsuario(email, senha)) {
        alert("Login realizado com sucesso!");
        window.location.href = "controle-financeiro.html"; // Redireciona para a página principal após login
    } else {
        alert("Email ou senha incorretos.");
    }

    // Limpa os campos de entrada do formulário de login
    this.email.value = '';
    this.senha.value = '';
});

async function removerUsuario(email, senha) {
    const stmt = db.prepare("SELECT * FROM usuarios WHERE email = ?");
    stmt.bind([email]);

    if (stmt.step()) {
        const usuario = stmt.getAsObject();
        const senhaHash = btoa(senha);
        if (usuario.senha === senhaHash) {
            // Corrigindo a consulta SQL para buscar o ID
            const id_remocao = usuario.id; // Armazena o ID do usuário

            // Deletando o usuário
            const deleteStmt = db.prepare("DELETE FROM usuarios WHERE email = ? AND senha = ?");
            deleteStmt.run([email, senhaHash]);
            deleteStmt.free();

            // Deletando as despesas associadas ao usuário
            const deleteStmt2 = db.prepare("DELETE FROM despesas WHERE id_usuario = ?");
            deleteStmt2.run([id_remocao]);
            deleteStmt2.free();

            // Salva o banco de dados após a remoção
            salvarBancoNoLocalStorage();
            return true; // Remoção bem sucedida
        }
    }
    return false; // Remoção falhou
}

document.getElementById('remocao-form').addEventListener('submit', async function(event) {
    event.preventDefault(); // Previne o envio padrão do formulário

    const email = this.email.value; // Captura o email
    const senha = this.senha.value; // Captura a senha

    if (await removerUsuario(email, senha)) {
        alert("Remoção realizada com sucesso!");
    } else {
        alert("Email ou senha incorretos.");
    }

    // Limpa os campos de entrada do formulário de login
    this.email.value = '';
    this.senha.value = '';
});