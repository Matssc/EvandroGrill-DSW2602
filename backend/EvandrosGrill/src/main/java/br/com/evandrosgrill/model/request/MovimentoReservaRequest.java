package br.com.evandrosgrill.model.request;

import br.com.evandrosgrill.model.enums.Finalidade;
import br.com.evandrosgrill.model.enums.TipoMovimento;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

// Usado em "Guardar valor" (ENTRADA) e "Registrar saída" (SAIDA)
public record MovimentoReservaRequest(

        // Se não vier, o service usa a data de hoje
        @PastOrPresent(message = "A data não pode ser futura")
        LocalDate data,

        @NotNull(message = "Informe se é entrada ou saída")
        TipoMovimento tipo,

        // Obrigatória nas saídas (regra validada no service)
        Finalidade finalidade,

        @NotBlank(message = "Informe a descrição")
        @Size(max = 150, message = "A descrição deve ter no máximo 150 caracteres")
        String descricao,

        @NotNull(message = "Informe o valor")
        @Positive(message = "O valor deve ser maior que zero")
        @Digits(integer = 10, fraction = 2)
        BigDecimal valor
) {
}
