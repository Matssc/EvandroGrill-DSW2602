package br.com.evandrosgrill.model.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

// Um produto dentro do lançamento de venda. O preço vem do cadastro do produto.
public record ItemVendaRequest(

        @NotNull(message = "Informe o produto")
        Long produtoId,

        @NotNull(message = "Informe a quantidade")
        @Positive(message = "A quantidade deve ser maior que zero")
        @Max(value = 9999, message = "Quantidade grande demais")
        Integer quantidade
) {
}
