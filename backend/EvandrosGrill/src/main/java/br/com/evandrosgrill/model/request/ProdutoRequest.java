package br.com.evandrosgrill.model.request;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ProdutoRequest(

        @NotNull(message = "Informe a categoria")
        Long categoriaId,

        @NotBlank(message = "Informe o código")
        @Size(max = 10, message = "O código deve ter no máximo 10 caracteres")
        String codigo,

        @NotBlank(message = "Informe o nome")
        @Size(max = 80, message = "O nome deve ter no máximo 80 caracteres")
        String nome,

        @Size(max = 255, message = "A descrição deve ter no máximo 255 caracteres")
        String descricao,

        @NotNull(message = "Informe o preço")
        @Positive(message = "O preço deve ser maior que zero")
        @Digits(integer = 8, fraction = 2)
        BigDecimal preco,

        @Size(max = 255, message = "O link da foto deve ter no máximo 255 caracteres")
        String fotoUrl,

        @NotNull(message = "Informe se o produto aparece no site")
        Boolean mostrarNoSite,

        @NotNull(message = "Informe se o produto é destaque")
        Boolean destaque
) {
}
