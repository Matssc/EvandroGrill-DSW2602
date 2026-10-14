package br.com.evandrosgrill.model.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record ConfiguracaoRequest(

        @NotNull(message = "Informe o percentual de retirada")
        @DecimalMin(value = "0.00", message = "O percentual não pode ser negativo")
        @DecimalMax(value = "100.00", message = "O percentual não pode passar de 100")
        @Digits(integer = 3, fraction = 2)
        BigDecimal percentualRetirada,

        @NotNull(message = "Informe se a retirada será dividida")
        Boolean dividirRetirada,

        @NotNull(message = "Informe o percentual do salário")
        @DecimalMin("0.00")
        @DecimalMax("100.00")
        @Digits(integer = 3, fraction = 2)
        BigDecimal percentualSalario,

        @NotNull(message = "Informe o percentual da reserva")
        @DecimalMin("0.00")
        @DecimalMax("100.00")
        @Digits(integer = 3, fraction = 2)
        BigDecimal percentualReserva,

        @DecimalMin(value = "0.00", message = "A meta não pode ser negativa")
        @Digits(integer = 10, fraction = 2)
        BigDecimal metaReserva
) {
}
