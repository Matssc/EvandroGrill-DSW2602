package br.com.evandrosgrill.model.response;

import br.com.evandrosgrill.model.entity.Venda;
import br.com.evandrosgrill.model.enums.FormaPagamentoVenda;
import br.com.evandrosgrill.model.enums.TipoLancamento;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

// Venda como a API devolve, com os itens e se o dia já foi fechado.
public record VendaResponse(
        Long id,
        LocalDate data,
        LocalTime hora,
        TipoLancamento tipoLancamento,
        String origem,
        FormaPagamentoVenda formaPagamento,
        BigDecimal valor,
        boolean fechada,
        List<ItemVendaResponse> itens
) {

    // Converte a entidade em resposta.
    public static VendaResponse de(Venda v) {
        return new VendaResponse(
                v.getId(),
                v.getData(),
                v.getHora(),
                v.getTipoLancamento(),
                v.getOrigem(),
                v.getFormaPagamento(),
                v.getValor(),
                v.getFechamentoDiario() != null,
                v.getItens().stream().map(ItemVendaResponse::de).toList());
    }
}
