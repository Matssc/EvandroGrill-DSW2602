package br.com.evandrosgrill.model.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CartaoPjRequest(

        @NotBlank(message = "Informe o apelido do cartão")
        @Size(max = 40, message = "O apelido deve ter no máximo 40 caracteres")
        String apelido,

        @Size(max = 20, message = "A bandeira deve ter no máximo 20 caracteres")
        String bandeira,

        @NotBlank(message = "Informe o final do cartão")
        @Pattern(regexp = "\\d{4}", message = "O final do cartão deve ter 4 números")
        String finalCartao,

        @Min(value = 1, message = "Dia inválido")
        @Max(value = 31, message = "Dia inválido")
        Short diaFechamento,

        @Min(value = 1, message = "Dia inválido")
        @Max(value = 31, message = "Dia inválido")
        Short diaVencimento,

        @NotNull(message = "Informe se o cartão está ativo")
        Boolean ativo
) {
}
