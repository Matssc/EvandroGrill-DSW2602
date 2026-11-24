package br.com.evandrosgrill.model.response;

import br.com.evandrosgrill.model.entity.FechamentoDiario;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

// Fechamento de um dia como a API devolve.
public record FechamentoDiarioResponse(
        Long id,
        LocalDate data,
        BigDecimal totalVendido,
        BigDecimal percentualRetirada,
        BigDecimal valorRetirada,
        BigDecimal percentualSalario,
        BigDecimal valorSalario,
        BigDecimal valorReserva,
        LocalDateTime fechadoEm
) {

    // Converte a entidade em resposta.
    public static FechamentoDiarioResponse de(FechamentoDiario f) {
        return new FechamentoDiarioResponse(
                f.getId(),
                f.getData(),
                f.getTotalVendido(),
                f.getPercentualRetirada(),
                f.getValorRetirada(),
                f.getPercentualSalario(),
                f.getValorSalario(),
                f.getValorReserva(),
                f.getFechadoEm());
    }
}
