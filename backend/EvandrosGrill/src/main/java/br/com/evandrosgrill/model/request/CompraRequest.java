package br.com.evandrosgrill.model.request;

import br.com.evandrosgrill.model.enums.FormaPagamentoCompra;
import br.com.evandrosgrill.model.enums.MeioAVista;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CompraRequest(

        @NotNull(message = "Informe a categoria")
        Long categoriaId,

        // Só quando a forma de pagamento é CARTAO (regra validada no service)
        Long cartaoPjId,

        @NotNull(message = "Informe a data da compra")
        @PastOrPresent(message = "A data da compra não pode ser futura")
        LocalDate data,

        @NotBlank(message = "Informe a descrição")
        @Size(max = 150, message = "A descrição deve ter no máximo 150 caracteres")
        String descricao,

        @NotNull(message = "Informe o valor")
        @Positive(message = "O valor deve ser maior que zero")
        @Digits(integer = 10, fraction = 2)
        BigDecimal valor,

        @NotNull(message = "Informe a forma de pagamento")
        FormaPagamentoCompra formaPagamento,

        // Só quando a forma de pagamento é A_VISTA (regra validada no service)
        MeioAVista meioAVista
) {
}
