let db;
let idUsuarioAtual = null; // Variável global para armazenar o ID do usuário logado
let totalEntradas = 0; // Variável para armazenar o total de entradas
let totalSaidas = 0; // Variável para armazenar o total de saídas

// Função para inicializar o SQL.js
async function loadSqlJs() {
    const SQL = await window.initSqlJs({
        locateFile: filename => `https://cdn.jsdelivr.net/npm/sql.js@1.6.2/dist/${filename}`
    });
    return SQL; // Retornar a biblioteca carregada
}

// Função para inicializar o banco de dados
async function initDatabase() {
    try {
        const SQL = await loadSqlJs(); // Inicializa a biblioteca SQL.js

        const dadosBase64 = localStorage.getItem('meu_banco.sqlite');
        if (dadosBase64) {
            const dados = new Uint8Array(atob(dadosBase64).split("").map(char => char.charCodeAt(0)));
            db = new SQL.Database(dados);
        } else {
            db = new SQL.Database(); // Cria um novo banco de dados se não houver no localStorage
        }

        // Criar tabela despesas se não existir
        db.run(`CREATE TABLE IF NOT EXISTS despesas (
            id_usuario INTEGER,
            descricao TEXT,
            data_hora TEXT,
            valor REAL,
            tipo TEXT
        )`);

        loadDespesas();
    } catch (error) {
        console.error("Erro ao inicializar o banco de dados:", error);
    }
}

// Função para carregar despesas do usuário logado
function loadDespesas() {
    if (idUsuarioAtual !== null) { 
        const stmt = db.prepare("SELECT * FROM despesas WHERE id_usuario = ?");
        stmt.bind([idUsuarioAtual]);

        while (stmt.step()) {
            const row = stmt.get();
            addRowToTable(row[1], row[2], row[3], row[4]); // Adiciona cada despesa à tabela
        }
        stmt.free();
    } else {
        console.error("Usuário não logado ou ID do usuário não encontrado.");
    }
}

// Função para formatar data e hora
function formatarDataHora(data) {
    const date = new Date(data);
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0'); // Janeiro é 0!
    const ano = String(date.getFullYear()).slice(-2); // Pega os dois últimos dígitos do ano
    const horas = String(date.getHours()).padStart(2, '0');
    const minutos = String(date.getMinutes()).padStart(2, '0');
    const segundos = String(date.getSeconds()).padStart(2, '0');

    return `${dia}/${mes}/${ano} ${horas}:${minutos}:${segundos}`; // Formato: dd/mm/yy hh:mm:ss
}

// Função para adicionar uma linha à tabela
function addRowToTable(descricao, dataHora, valor, tipo) {
    let nova_linha = document.createElement('tr');
    let linha_descricao = document.createElement('td');
    let linha_data_hora = document.createElement('td');
    let linha_valor = document.createElement('td');
    let linha_tipo = document.createElement('td');
    let linha_delete = document.createElement('td');

    // Preencher colunas
    linha_descricao.textContent = descricao;
    linha_data_hora.textContent = formatarDataHora(dataHora); // Formata a data e hora para exibição

    // Adiciona o sinal negativo para saídas
    linha_valor.textContent = tipo === "Saída" ? (-valor).toFixed(2).replace('.', ',') : valor.toFixed(2).replace('.', ',');
    linha_tipo.textContent = tipo;

    linha_descricao.className = "kanit-thin";
    linha_data_hora.className = "kanit-thin";
    linha_valor.className = "kanit-thin";
    linha_tipo.className = "kanit-thin";

    linha_valor.style.color = tipo === "Entrada" ? "green" : "red";
    linha_tipo.style.color = tipo === "Entrada" ? "green" : "red";

    linha_delete.innerHTML = "<img src='https://static.vecteezy.com/ti/vetor-gratis/p1/9899630-lixeira-lixeira-lixeira-sinal-icone-preto-lata-lixeira-icone-lixeira-gratis-vetor.jpg' alt='delete'>";

    linha_delete.addEventListener('click', () => {
        nova_linha.remove();
        removeDespesa(idUsuarioAtual, descricao, dataHora, tipo, valor); // tipo e valor para a função de remoção
    });

    let cabecalho = document.querySelector('.cabecalho-tabela');
    nova_linha.append(linha_descricao, linha_data_hora, linha_valor, linha_tipo, linha_delete);

    cabecalho.insertAdjacentElement('afterend', nova_linha);

    // Atualiza os totais conforme o tipo
    if (tipo === "Entrada") {
        totalEntradas += valor;
    } else {
        totalSaidas += valor;
    }
    atualizarTotais();
}

function removeDespesa(id_usuario, descricao, dataHora, tipo, valor) {
    // Verifica e garante que o valor tenha o formato correto
    const valorFormatado = parseFloat(valor).toFixed(2);

    // Remover a despesa do banco de dados com os valores formatados
    const deleteStmt = db.prepare("DELETE FROM despesas WHERE id_usuario = ? AND descricao = ? AND data_hora = ? AND valor = ? AND tipo = ?");
    deleteStmt.run([id_usuario, descricao, dataHora, valorFormatado, tipo]);

    // Exporta novamente o banco de dados atualizado para o localStorage
    const dadosAtualizados = db.export();
    const dadosBase64Atualizados = btoa(String.fromCharCode.apply(null, dadosAtualizados));
    localStorage.setItem('meu_banco.sqlite', dadosBase64Atualizados);

    deleteStmt.free();

    // Atualiza os totais conforme o tipo da despesa removida
    if (tipo === "Entrada") {
        totalEntradas -= parseFloat(valor); // Subtrai o valor das entradas
    } else {
        totalSaidas -= parseFloat(valor); // Subtrai o valor das saídas
    }

    atualizarTotais(); // Atualiza a exibição dos totais
}


// Função para atualizar totais
function atualizarTotais() {
    const total = totalEntradas - totalSaidas;
    document.querySelector("#valor-real-entrada").textContent = totalEntradas.toFixed(2).replace('.', ',');
    document.querySelector("#valor-real-saida").textContent = totalSaidas.toFixed(2).replace('.', ',');
    document.querySelector("#valor-real-total").textContent = total.toFixed(2).replace('.', ',');

    // Altera a cor do total com base no valor
    const totalElement = document.querySelector("#valor-total");
    totalElement.style.color = total > 0 ? "green" : "red";
}

// Inicialização do DOM
document.addEventListener('DOMContentLoaded', async () => {
    idUsuarioAtual = localStorage.getItem('id_usuario'); 
    if (!idUsuarioAtual){
      alert("Usuário não logado, Redirecionando para a página de login...")
      window.location.href = "index.html"
    }
    else{
      await initDatabase(); 

    const botao_adicionar = document.querySelector('#adicionar-despesa');
    botao_adicionar.addEventListener('click', () => {
        let input_descricao = document.querySelector("#input-descricao").value;
        let input_valor = document.querySelector("#input-valor").value.replace(',', '.'); 
        let input_entrada = document.querySelector("#entrada");
        let input_saida = document.querySelector("#saida");

        if (input_descricao !== '' && !isNaN(parseFloat(input_valor)) && (input_entrada.checked === true || input_saida.checked === true)) {
            let dataHora = new Date().toISOString(); // Obter data e hora atual em formato ISO

            let tipo = input_entrada.checked ? "Entrada" : "Saída"; 

            addRowToTable(input_descricao, dataHora, parseFloat(input_valor), tipo);

            const insertStmt = db.prepare("INSERT INTO despesas (id_usuario, descricao, data_hora, valor, tipo) VALUES (?, ?, ?, ?, ?)");
            insertStmt.run([idUsuarioAtual, input_descricao, dataHora, parseFloat(input_valor), tipo]);
            insertStmt.free();

            const dados = db.export();
            const dadosBase64 = btoa(String.fromCharCode.apply(null, dados));
            localStorage.setItem('meu_banco.sqlite', dadosBase64); 

            // Limpar campos após adição
            document.querySelector("#input-descricao").value = '';
            document.querySelector("#input-valor").value = '';
            input_entrada.checked = false;
            input_saida.checked = false;
        } else {
            alert("Por favor, preencha todos os campos corretamente.");
          }
        });
     }
});