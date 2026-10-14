package br.com.evandrosgrill.model.request;

import br.com.evandrosgrill.model.enums.FormaPagamentoVenda;
import br.com.evandrosgrill.model.enums.TipoLancamento;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record VendaRequest(

        // Se não vier, o service usa a data de hoje
        @PastOrPresent(message = "A data da venda não pode ser futura")
        LocalDate data,

        // Se não vier, o service usa a hora atual (venda "Por venda")
        LocalTime hora,

        @NotNull(message = "Informe o tipo de lançamento")
        TipoLancamento tipoLancamento,

        @Size(max = 60, message = "A origem deve ter no máximo 60 caracteres")
        String origem,

        FormaPagamentoVenda formaPagamento,

        // "Total do dia": o total digitado. "Por venda": o service calcula pela soma dos itens
        @Positive(message = "O valor deve ser maior que zero")
        @Digits(integer = 10, fraction = 2)
        BigDecimal valor,

        // Produtos vendidos: obrigatórios no "Por venda" e opcionais no "Total do dia"
        @Valid
        @Size(max = 50, message = "No máximo 50 produtos diferentes por lançamento")
        List<ItemVendaRequest> itens
) {
}
