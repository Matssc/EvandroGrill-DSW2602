-- =====================================================================
--  Evandro's Grill - esquema completo do banco (MySQL 8)
--  Gerado a partir das 10 entities do projeto (br.com.evandrosgrill.model.entity)
--
--  Como usar:
--   * Banco vazio: execute o script inteiro.
--   * Se o Hibernate (ddl-auto=update) já criou as tabelas, o script dá erro
--     "Table already exists". Nesse caso, tire o "--" da linha DROP DATABASE
--     abaixo (isso APAGA TODOS OS DADOS) e execute de novo.
-- =====================================================================

-- DROP DATABASE IF EXISTS evandros_grill;

CREATE DATABASE IF NOT EXISTS evandros_grill
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE evandros_grill;

-- ---------------------------------------------------------------------
-- 1) usuario: dono dos dados (hoje só o Evandro). Todas as outras
--    tabelas apontam para ela (isolamento por usuário, RN10).
-- ---------------------------------------------------------------------
CREATE TABLE usuario (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    nome          VARCHAR(100) NOT NULL,
    nome_negocio  VARCHAR(120) NOT NULL,
    email         VARCHAR(150) NOT NULL,
    senha_hash    VARCHAR(255) NOT NULL,          -- hash BCrypt, nunca a senha
    criado_em     DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_usuario_email UNIQUE (email)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 2) configuracao: regras da retirada (uma por usuário)
-- ---------------------------------------------------------------------
CREATE TABLE configuracao (
    id                   BIGINT        NOT NULL AUTO_INCREMENT,
    usuario_id           BIGINT        NOT NULL,
    percentual_retirada  DECIMAL(5,2)  NOT NULL,   -- ex.: 30.00
    dividir_retirada     BIT(1)        NOT NULL,   -- divide entre salário e reserva?
    percentual_salario   DECIMAL(5,2)  NOT NULL,   -- ex.: 50.00
    percentual_reserva   DECIMAL(5,2)  NOT NULL,   -- ex.: 50.00
    meta_reserva         DECIMAL(12,2) NULL,
    atualizado_em        DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_configuracao_usuario UNIQUE (usuario_id),
    CONSTRAINT fk_configuracao_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 3) categoria: categorias de compra e de produto.
--    O mesmo nome pode existir nos dois tipos (ex.: "Bebidas").
-- ---------------------------------------------------------------------
CREATE TABLE categoria (
    id          BIGINT      NOT NULL AUTO_INCREMENT,
    usuario_id  BIGINT      NOT NULL,
    tipo        ENUM('COMPRA', 'PRODUTO') NOT NULL,
    nome        VARCHAR(40) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_categoria_usuario_tipo_nome UNIQUE (usuario_id, tipo, nome),
    CONSTRAINT fk_categoria_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 4) cartao_pj: cartões da empresa
-- ---------------------------------------------------------------------
CREATE TABLE cartao_pj (
    id              BIGINT      NOT NULL AUTO_INCREMENT,
    usuario_id      BIGINT      NOT NULL,
    apelido         VARCHAR(40) NOT NULL,           -- ex.: "PJ Compras"
    bandeira        VARCHAR(20) NULL,               -- ex.: Mastercard, Visa
    final_cartao    CHAR(4)     NOT NULL,           -- ex.: 4417
    dia_fechamento  SMALLINT    NULL,               -- dia do mês em que a fatura fecha
    dia_vencimento  SMALLINT    NULL,
    ativo           BIT(1)      NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_cartao_pj_usuario_apelido UNIQUE (usuario_id, apelido),
    CONSTRAINT fk_cartao_pj_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 5) produto: cardápio (aparece na landing page quando mostrar_no_site = 1)
-- ---------------------------------------------------------------------
CREATE TABLE produto (
    id               BIGINT        NOT NULL AUTO_INCREMENT,
    usuario_id       BIGINT        NOT NULL,
    categoria_id     BIGINT        NOT NULL,
    codigo           VARCHAR(10)   NOT NULL,        -- ex.: ESP-001
    nome             VARCHAR(80)   NOT NULL,
    descricao        VARCHAR(255)  NULL,
    preco            DECIMAL(10,2) NOT NULL,
    foto_url         VARCHAR(255)  NULL,
    mostrar_no_site  BIT(1)        NOT NULL,
    destaque         BIT(1)        NOT NULL,        -- selo "Mais pedido"
    PRIMARY KEY (id),
    CONSTRAINT uk_produto_usuario_codigo UNIQUE (usuario_id, codigo),
    CONSTRAINT fk_produto_usuario   FOREIGN KEY (usuario_id)   REFERENCES usuario (id),
    CONSTRAINT fk_produto_categoria FOREIGN KEY (categoria_id) REFERENCES categoria (id)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 6) fechamento_diario: um por dia fechado (= um dia trabalhado).
--    Guarda os percentuais da época do fechamento (histórico).
-- ---------------------------------------------------------------------
CREATE TABLE fechamento_diario (
    id                   BIGINT        NOT NULL AUTO_INCREMENT,
    usuario_id           BIGINT        NOT NULL,
    data                 DATE          NOT NULL,
    total_vendido        DECIMAL(12,2) NOT NULL,
    percentual_retirada  DECIMAL(5,2)  NOT NULL,
    valor_retirada       DECIMAL(12,2) NOT NULL,
    percentual_salario   DECIMAL(5,2)  NOT NULL,
    valor_salario        DECIMAL(12,2) NOT NULL,
    valor_reserva        DECIMAL(12,2) NOT NULL,
    fechado_em           DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_fechamento_usuario_data UNIQUE (usuario_id, data),
    CONSTRAINT fk_fechamento_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 7) venda: lançamentos de venda. fechamento_diario_id fica vazio até o
--    dia ser fechado; depois disso a venda não pode mais ser alterada.
-- ---------------------------------------------------------------------
CREATE TABLE venda (
    id                    BIGINT        NOT NULL AUTO_INCREMENT,
    usuario_id            BIGINT        NOT NULL,
    fechamento_diario_id  BIGINT        NULL,
    data                  DATE          NOT NULL,
    hora                  TIME(6)       NULL,       -- vazia em "Total do dia"
    tipo_lancamento       ENUM('TOTAL_DIA', 'POR_VENDA') NOT NULL,
    origem                VARCHAR(60)   NULL,       -- ex.: Mesa 4, Balcão, WhatsApp
    forma_pagamento       ENUM('DINHEIRO', 'PIX', 'DEBITO', 'CREDITO') NULL,
    valor                 DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_venda_usuario    FOREIGN KEY (usuario_id)           REFERENCES usuario (id),
    CONSTRAINT fk_venda_fechamento FOREIGN KEY (fechamento_diario_id) REFERENCES fechamento_diario (id),
    INDEX idx_venda_usuario_data (usuario_id, data)  -- acelera "vendas do dia"
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 7b) venda_item: os produtos de cada venda (quantos e por quanto).
--     No "Por venda" o valor da venda é a soma dos itens; no "Total do dia"
--     os itens são opcionais e só contam o que saiu.
-- ---------------------------------------------------------------------
CREATE TABLE venda_item (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    venda_id        BIGINT        NOT NULL,
    produto_id      BIGINT        NOT NULL,
    quantidade      INT           NOT NULL,
    preco_unitario  DECIMAL(10,2) NOT NULL,      -- preço do produto na hora da venda
    PRIMARY KEY (id),
    CONSTRAINT fk_venda_item_venda   FOREIGN KEY (venda_id)   REFERENCES venda (id),
    CONSTRAINT fk_venda_item_produto FOREIGN KEY (produto_id) REFERENCES produto (id)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 8) movimento_reserva: entradas e saídas do caixa da empresa.
--    A entrada gerada por um fechamento aponta para ele (no máximo uma).
-- ---------------------------------------------------------------------
CREATE TABLE movimento_reserva (
    id                    BIGINT        NOT NULL AUTO_INCREMENT,
    usuario_id            BIGINT        NOT NULL,
    fechamento_diario_id  BIGINT        NULL,
    data                  DATE          NOT NULL,
    tipo                  ENUM('ENTRADA', 'SAIDA') NOT NULL,
    finalidade            ENUM('EMERGENCIA', 'INVESTIMENTO') NULL,  -- obrigatória nas saídas
    descricao             VARCHAR(150)  NOT NULL,
    valor                 DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_movimento_fechamento UNIQUE (fechamento_diario_id),
    CONSTRAINT fk_movimento_usuario    FOREIGN KEY (usuario_id)           REFERENCES usuario (id),
    CONSTRAINT fk_movimento_fechamento FOREIGN KEY (fechamento_diario_id) REFERENCES fechamento_diario (id),
    INDEX idx_movimento_usuario_data (usuario_id, data)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 9) compra: compras da empresa. No cartão: cartao_pj_id preenchido.
--    À vista: cartao_pj_id vazio e, se quiser, meio_a_vista.
-- ---------------------------------------------------------------------
CREATE TABLE compra (
    id               BIGINT        NOT NULL AUTO_INCREMENT,
    usuario_id       BIGINT        NOT NULL,
    categoria_id     BIGINT        NOT NULL,
    cartao_pj_id     BIGINT        NULL,
    data             DATE          NOT NULL,
    descricao        VARCHAR(150)  NOT NULL,
    valor            DECIMAL(12,2) NOT NULL,
    forma_pagamento  ENUM('A_VISTA', 'CARTAO') NOT NULL,
    meio_a_vista     ENUM('DINHEIRO', 'PIX', 'DEBITO') NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_compra_usuario   FOREIGN KEY (usuario_id)   REFERENCES usuario (id),
    CONSTRAINT fk_compra_categoria FOREIGN KEY (categoria_id) REFERENCES categoria (id),
    CONSTRAINT fk_compra_cartao    FOREIGN KEY (cartao_pj_id) REFERENCES cartao_pj (id),
    INDEX idx_compra_usuario_data (usuario_id, data)
) ENGINE = InnoDB;