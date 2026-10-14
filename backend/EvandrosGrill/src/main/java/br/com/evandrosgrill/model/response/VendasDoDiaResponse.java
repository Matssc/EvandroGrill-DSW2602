package br.com.evandrosgrill.model.response;

import br.com.evandrosgrill.model.enums.FormaPagamentoVenda;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

// Tela "Vendas do dia": total, ticket médio e "Hoje por pagamento"
public record VendasDoDiaResponse(
        LocalDate data,
        boolean diaFechado,
        BigDecimal total,
        long quantidade,
        BigDecimal ticketMedio,
        List<Pagamento> porPagamento
) {

    public record Pagamento(FormaPagamentoVenda formaPagamento, long quantidade, BigDecimal total) {
    }
}
