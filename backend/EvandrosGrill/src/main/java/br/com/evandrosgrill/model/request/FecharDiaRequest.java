package br.com.evandrosgrill.model.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;

import java.time.LocalDate;

// Os valores do fechamento (retirada, salário, reserva) são calculados no service
public record FecharDiaRequest(

        @NotNull(message = "Informe a data do fechamento")
        @PastOrPresent(message = "Não é possível fechar um dia futuro")
        LocalDate data
) {
}
