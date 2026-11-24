package br.com.evandrosgrill.model.response;

import java.math.BigDecimal;
import java.time.LocalDate;

// Painel "Fechar o dia": mostra o cálculo antes de confirmar. Montado no service.
public record PreviaFechamentoResponse(
        LocalDate data,
        BigDecimal totalVendido,
        BigDecimal percentualRetirada,
        BigDecimal valorRetirada,
        BigDecimal percentualSalario,
        BigDecimal valorSalario,
        BigDecimal valorReserva,
        BigDecimal ficaNoCaixa,
        long numeroDiaTrabalhado
) {
}
