package br.com.evandrosgrill.model.response;

import java.math.BigDecimal;

// Cards da tela "Reserva da empresa" para o mês escolhido
public record ReservaResumoResponse(
        BigDecimal saldo,
        BigDecimal entrouNoMes,
        BigDecimal saiuNoMes,
        BigDecimal saldoMesAnterior,
        BigDecimal metaReserva,
        BigDecimal percentualMeta,
        BigDecimal faltaParaMeta
) {
}
